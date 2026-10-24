/*
 * <LiquidGlass> — cristal con refracción óptica real en el borde (Blink) y degradado progresivo.
 *
 * Modos (atributo `data-glass` en la raíz):
 * - "refraction": `backdrop-filter: url(#filtro)` con un mapa de desplazamiento calculado para el
 *   tamaño exacto del elemento (ver src/lib/liquid-glass.ts). Solo Chromium/Blink.
 * - "blur": `backdrop-filter: blur() saturate()` con las mismas capas especulares y de luz de borde.
 *   Safari, Firefox, SSR/primer render, `forceFallback`, o mientras aún no se ha medido.
 * - Con `prefers-reduced-transparency: reduce` el CSS pasa a superficie sólida (#140102 / #ffffff).
 *
 * RESTRICCIÓN IMPORTANTE (igual que `.glass` en src/styles/glass.css): un elemento con
 * `backdrop-filter` solo ve lo que hay detrás hasta su "backdrop root". Si algún ancestro tiene
 * opacity < 1, filter, mask, clip-path, mix-blend-mode, otro backdrop-filter (o will-change de
 * alguno de ellos), el cristal solo verá el contenido de ese ancestro y no la página. Por eso:
 * - no anides un LiquidGlass dentro de otro (ni dentro de `.glass`);
 * - anima entradas/salidas en el propio elemento (transform, opacity) y no en un contenedor;
 * - la raíz crea un contexto de apilamiento (isolation), así que las capas quedan bajo los hijos.
 *
 * Verificado en Chromium 141: `isolation: isolate` no convierte la raíz en backdrop root, y el
 * espacio de usuario del filtro es la border-box de la capa (px CSS, independiente del DPR).
 */
import { cn } from '@/lib/cn';
import {
  getDisplacementMapUrl,
  resolveGeometry,
  supportsSvgBackdropFilter,
  type GlassProfile,
} from '@/lib/liquid-glass';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './LiquidGlass.module.css';

interface LiquidGlassOwnProps<T extends ElementType> {
  /** Elemento a renderizar (div, nav, button, aside, section…). */
  as?: T;
  /** Radio de esquina en px, o 'pill'. */
  radius?: number | 'pill';
  /** Ancho en px del borde que refracta. La zona interior queda plana (sin deformar). */
  bezel?: number;
  /** Desplazamiento máximo en px CSS en el bisel. 0 desactiva la refracción. */
  refraction?: number;
  /** Desenfoque (px) del fondo bajo el cristal. */
  frost?: number;
  /** Aberración cromática relativa (0–0.3). R, G y B se desplazan con escalas ligeramente distintas. */
  aberration?: number;
  /** Saturación del fondo (1 = sin cambio). */
  saturation?: number;
  /**
   * Perfil del bisel: squircle (borde más marcado), arco circular (más ancho y suave) o gota
   * (toda la profundidad del bisel actúa como lente: borde que comprime y centro que amplía).
   */
  profile?: GlassProfile;
  /** Tinte: oscuro rgb(20 1 2 / .35) o claro rgb(255 255 255 / .45). */
  tone?: 'dark' | 'light';
  /** Brillo especular y luz de borde que siguen al puntero (solo puntero fino, sin reduced-motion). */
  interactive?: boolean;
  /** Fuerza el modo sin refracción (blur + capas especulares). Útil para comparar o depurar. */
  forceFallback?: boolean;
  /**
   * Control imperativo de la lente para animarla sin re-render (p. ej. que «tiemble» con la
   * velocidad del scroll): `setBoost(1)` es la refracción nominal, 1.6 un 60 % más.
   */
  lensRef?: Ref<LensControl | null>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface LensControl {
  setBoost(factor: number): void;
}

export type LiquidGlassProps<T extends ElementType = 'div'> = LiquidGlassOwnProps<T> &
  Omit<ComponentPropsWithRef<T>, keyof LiquidGlassOwnProps<T>>;

/* ─── Suscripciones de entorno (SSR-safe: el servidor y la hidratación ven "sin refracción") ─── */

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  };
}
function readMedia(query: string) {
  return () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;
}
const REDUCED_TRANSPARENCY = '(prefers-reduced-transparency: reduce)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const subReducedTransparency = subscribeMedia(REDUCED_TRANSPARENCY);
const getReducedTransparency = readMedia(REDUCED_TRANSPARENCY);
const subReducedMotion = subscribeMedia(REDUCED_MOTION);
const getReducedMotion = readMedia(REDUCED_MOTION);
const subFinePointer = subscribeMedia(FINE_POINTER);
const getFinePointer = readMedia(FINE_POINTER);
const noopSubscribe = () => () => {};
let svgSupportCache: boolean | undefined;
const getSvgSupport = () => (svgSupportCache ??= supportsSvgBackdropFilter());
const getFalse = () => false;

/** Retraso para regenerar el mapa al redimensionar (el filtro se estira mientras tanto). */
const REGENERATE_DEBOUNCE_MS = 140;

interface Size {
  w: number;
  h: number;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function LiquidGlass<T extends ElementType = 'div'>({
  as,
  radius = 24,
  bezel = 16,
  refraction = 26,
  frost = 1.5,
  aberration = 0.06,
  saturation = 1.6,
  profile = 'squircle',
  tone = 'dark',
  interactive = false,
  forceFallback = false,
  lensRef,
  className,
  style,
  children,
  ref,
  ...rest
}: LiquidGlassProps<T>) {
  const Tag: ElementType = as ?? 'div';
  const nodeRef = useRef<HTMLElement | null>(null);
  const filterId = `lg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const svgSupported = useSyncExternalStore(noopSubscribe, getSvgSupport, getFalse);
  const reducedTransparency = useSyncExternalStore(subReducedTransparency, getReducedTransparency, getFalse);
  const reducedMotion = useSyncExternalStore(subReducedMotion, getReducedMotion, getFalse);
  const finePointer = useSyncExternalStore(subFinePointer, getFinePointer, getFalse);

  const wantsRefraction = svgSupported && !forceFallback && !reducedTransparency && refraction > 0;

  // Tamaño CSS actual (para el filtro) y tamaño con el que se generó el mapa (debounce).
  const [size, setSize] = useState<Size | null>(null);
  const [mapSize, setMapSize] = useState<Size | null>(null);

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      setRef(ref as Ref<HTMLElement> | undefined, node);
    },
    [ref],
  );

  /* Medición: ResizeObserver con border-box; primera medida inmediata, el resto con debounce. */
  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !wantsRefraction || typeof ResizeObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const box = entry.borderBoxSize?.[0];
      // borderBoxSize ignora transform (a diferencia de getBoundingClientRect), que es lo que
      // queremos: el espacio de usuario del filtro es la caja CSS sin transformar.
      const w = Math.round(box ? box.inlineSize : node.offsetWidth);
      const h = Math.round(box ? box.blockSize : node.offsetHeight);
      if (w < 2 || h < 2) return;
      const next = { w, h };
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : next));
      if (timer) clearTimeout(timer);
      if (first) {
        first = false;
        setMapSize(next);
      } else {
        timer = setTimeout(() => setMapSize((prev) => (prev && prev.w === w && prev.h === h ? prev : next)), REGENERATE_DEBOUNCE_MS);
      }
    });
    ro.observe(node, { box: 'border-box' });
    return () => {
      ro.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [wantsRefraction]);

  // El mapa solo se recalcula al cambiar geometría (y está cacheado por w×h×radio×bisel).
  const mapUrl = useMemo(
    () => (wantsRefraction && mapSize ? getDisplacementMapUrl({ width: mapSize.w, height: mapSize.h, radius, bezel, profile }) : null),
    [wantsRefraction, mapSize, radius, bezel, profile],
  );

  const refracting = wantsRefraction && !!mapUrl && !!size;

  /* Brillo que sigue al puntero: variables CSS escritas en rAF, solo puntero fino. */
  const pointerActive = interactive && finePointer && !reducedMotion;
  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !pointerActive) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (px - rect.left) / rect.width;
      const y = (py - rect.top) / rect.height;
      const angle = (Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 90;
      node.style.setProperty('--lg-px', `${(x * 100).toFixed(1)}%`);
      node.style.setProperty('--lg-py', `${(y * 100).toFixed(1)}%`);
      node.style.setProperty('--lg-angle', `${angle.toFixed(1)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onEnter = (e: PointerEvent) => {
      onMove(e);
      node.dataset.lit = 'true';
    };
    const onLeave = () => {
      delete node.dataset.lit;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      node.style.removeProperty('--lg-px');
      node.style.removeProperty('--lg-py');
      node.style.removeProperty('--lg-angle');
    };
    node.addEventListener('pointerenter', onEnter);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointerenter', onEnter);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
      onLeave();
    };
  }, [pointerActive]);

  /* Lente animable: reescala los feDisplacementMap (cada uno guarda su escala nominal). */
  const filterRef = useRef<SVGFilterElement | null>(null);
  useImperativeHandle(
    lensRef,
    () => ({
      setBoost(factor: number) {
        filterRef.current?.querySelectorAll<SVGFEDisplacementMapElement>('feDisplacementMap').forEach((node) => {
          const base = Number(node.dataset.scale);
          if (Number.isFinite(base)) node.setAttribute('scale', (base * factor).toFixed(2));
        });
      },
    }),
    [],
  );

  const radiusCss = radius === 'pill' ? '9999px' : `${radius}px`;
  const rootStyle = {
    ...style,
    '--lg-radius': radiusCss,
    ...(refracting ? { '--lg-filter': `url(#${filterId})` } : null),
  } as CSSProperties;

  // Geometría real usada por el mapa (bisel recortado a la mitad del lado menor) — para el SVG.
  const geom = size ? resolveGeometry(size.w, size.h, radius, bezel) : null;
  const scale = refraction * 2; // ver nota de codificación en liquid-glass.ts
  const ab = Math.min(0.3, Math.max(0, aberration));

  return (
    <Tag
      {...rest}
      ref={combinedRef}
      className={cn(styles.root, className)}
      style={rootStyle}
      data-glass={refracting ? 'refraction' : 'blur'}
      data-tone={tone}
      data-interactive={pointerActive || undefined}
    >
      {/* Capa óptica: backdrop-filter + tinte + filos interiores. Va en un hijo propio y sin sombra
          exterior porque Blink resuelve el espacio de usuario del filtro url() contra el rectángulo
          de desbordamiento visual (ink overflow) del elemento: una box-shadow, un outline o un hijo
          que se salga desplazarían el origen del mapa respecto a la caja. */}
      <span className={styles.lens} aria-hidden="true" />
      {children}
      {refracting && geom && typeof document !== 'undefined'
        ? createPortal(
            <svg className={styles.defs} aria-hidden="true" focusable="false" width="0" height="0">
              <filter
                ref={filterRef}
                id={filterId}
                filterUnits="userSpaceOnUse"
                primitiveUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={geom.width}
                height={geom.height}
                colorInterpolationFilters="sRGB"
              >
                {/* sRGB es imprescindible: en linearRGB el 128 del mapa dejaría de ser "neutro". */}
                <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(0, frost)} edgeMode="duplicate" result="frost" />
                <feImage href={mapUrl ?? undefined} x="0" y="0" width={geom.width} height={geom.height} preserveAspectRatio="none" result="map" />
                {ab > 0 ? (
                  <>
                    <feDisplacementMap in="frost" in2="map" scale={scale * (1 + ab)} data-scale={scale * (1 + ab)} xChannelSelector="R" yChannelSelector="G" result="dispR" />
                    <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chR" />
                    <feDisplacementMap in="frost" in2="map" scale={scale} data-scale={scale} xChannelSelector="R" yChannelSelector="G" result="dispG" />
                    <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chG" />
                    <feDisplacementMap in="frost" in2="map" scale={scale * (1 - ab)} data-scale={scale * (1 - ab)} xChannelSelector="R" yChannelSelector="G" result="dispB" />
                    <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="chB" />
                    <feComposite in="chR" in2="chG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="chRG" />
                    <feComposite in="chRG" in2="chB" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="refracted" />
                  </>
                ) : (
                  <feDisplacementMap in="frost" in2="map" scale={scale} data-scale={scale} xChannelSelector="R" yChannelSelector="G" result="refracted" />
                )}
                <feColorMatrix in="refracted" type="saturate" values={String(saturation)} />
              </filter>
            </svg>,
            document.body,
          )
        : null}
    </Tag>
  );
}

export default LiquidGlass;
