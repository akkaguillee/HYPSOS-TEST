import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, useGSAP } from '@/lib/motion';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

interface GraffitiTagProps {
  /** Palabra o frase corta pintada (decorativa: el texto real está en el DOM en otro sitio). */
  children: string;
  color?: string;
  /** Con regueros de pintura bajo las letras. */
  drips?: boolean;
  trigger?: 'scroll' | 'manual' | 'static';
  delay?: number;
  className?: string;
  style?: CSSProperties;
  onReady?: (timeline: gsap.core.Timeline) => void;
}

const FONT_SIZE = 100;
const BASELINE = 100;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Tag pintado a espray con la tipografía de graffiti (Sedgwick Ave Display). El texto se descubre
 * con una máscara que la boquilla «barre» de izquierda a derecha (DrawSVG sobre un trazo ancho) y
 * la textura de espray la pone el filtro `#hyp-spray`. Después escurren unas gotas.
 */
export function GraffitiTag({ children, color = 'var(--c-red)', drips = true, trigger = 'scroll', delay = 0, className, style, onReady }: GraffitiTagProps) {
  const root = useRef<SVGSVGElement>(null);
  const text = useRef<SVGTextElement>(null);
  const maskId = `tag-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const reduced = useReducedMotion();
  const [box, setBox] = useState<Box>({ x: 0, y: 20, w: children.length * 52, h: 100 });

  // La caja real depende de la fuente: se mide cuando está cargada.
  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive || !text.current) return;
      const b = text.current.getBBox();
      if (b.width > 0) setBox({ x: b.x, y: b.y, w: b.width, h: b.height });
    };
    measure();
    void document.fonts?.load(`400 ${FONT_SIZE}px "Sedgwick Ave Display"`).then(measure);
    return () => {
      alive = false;
    };
  }, [children]);

  const pad = box.h * 0.35;
  const viewBox = `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2.6}`;
  const sweepY = box.y + box.h / 2;
  const sweep = `M${box.x - pad} ${sweepY + box.h * 0.12}C${box.x + box.w * 0.3} ${sweepY - box.h * 0.1} ${box.x + box.w * 0.7} ${sweepY + box.h * 0.1} ${box.x + box.w + pad} ${sweepY - box.h * 0.08}`;
  const dripSpots = [0.18, 0.52, 0.83].map((t, index) => ({
    x: box.x + box.w * t,
    y: BASELINE - box.h * 0.08,
    length: box.h * (0.28 + index * 0.12),
  }));

  useGSAP(
    () => {
      const svg = root.current;
      if (!svg || reduced || trigger === 'static') return;
      const sweepPath = svg.querySelector<SVGPathElement>('[data-sweep]');
      const runs = Array.from(svg.querySelectorAll<SVGPathElement>('[data-drip]'));
      const beads = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-bead]'));
      const tl = gsap.timeline({
        delay,
        paused: trigger === 'manual',
        scrollTrigger: trigger === 'scroll' ? { trigger: svg, start: 'top 86%', once: true } : undefined,
      });
      if (sweepPath) tl.fromTo(sweepPath, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45 + children.length * 0.05, ease: EASE.stroke });
      runs.forEach((run, index) => {
        const fall = 1 + index * 0.3;
        const at = 0.35 + index * 0.16;
        tl.fromTo(run, { drawSVG: '0%' }, { drawSVG: '100%', duration: fall, ease: EASE.drip }, at);
        tl.fromTo(beads[index], { scale: 0.4, y: -Number(run.dataset.length), transformOrigin: '50% 50%' }, { scale: 1, y: 0, duration: fall, ease: EASE.drip }, at);
      });
      onReady?.(tl);
    },
    { scope: root, dependencies: [reduced, trigger, viewBox], revertOnUpdate: true },
  );

  const dripWidth = box.h * 0.045;
  return (
    <svg ref={root} viewBox={viewBox} className={className} style={{ overflow: 'visible', ...style }} aria-hidden="true" focusable="false">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={box.x - pad * 2} y={box.y - pad * 2} width={box.w + pad * 4} height={box.h + pad * 4}>
          <path d={sweep} stroke="#fff" strokeWidth={box.h * 1.7} strokeLinecap="round" fill="none" data-sweep="" />
        </mask>
      </defs>
      <g filter="url(#hyp-spray)">
        <g mask={`url(#${maskId})`}>
          <text ref={text} x={0} y={BASELINE} style={{ fill: color, fontFamily: 'var(--font-tag)', fontSize: FONT_SIZE }}>
            {children}
          </text>
        </g>
        {drips &&
          dripSpots.map((drip, index) => (
            <g key={index} style={{ stroke: color, fill: 'none' }} strokeLinecap="round">
              <path d={`M${drip.x} ${drip.y}L${drip.x} ${drip.y + drip.length}`} strokeWidth={dripWidth} data-drip="" data-length={drip.length} />
              <circle cx={drip.x} cy={drip.y + drip.length} r={dripWidth * 0.8} style={{ fill: color, stroke: 'none' }} data-bead="" />
            </g>
          ))}
      </g>
    </svg>
  );
}
