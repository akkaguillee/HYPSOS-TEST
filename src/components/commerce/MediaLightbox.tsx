import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { Product, ProductMedia as Media } from '@shared/types';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import styles from './MediaLightbox.module.css';
import { ProductMedia } from './ProductMedia';

interface MediaLightboxProps {
  product: Product;
  media: Media[];
  colorId: string;
  open: boolean;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Zoom máximo: los mockups se exportan a 960 px, más allá solo se vería el reescalado. */
const MAX_ZOOM = 2.5;
const CLICK_ZOOM = 2;
const STEP = 0.75;

/**
 * Galería a pantalla completa sobre el fondo de estudio, con zoom: clic/toque para ampliar en el
 * punto señalado, arrastre para desplazarse, rueda o botones +/− y teclado (flechas, +, −, Escape).
 * La prenda se muestra siempre entera (marco 4:5 que cabe en el visor); los controles son de cristal.
 */
export function MediaLightbox({ product, media, colorId, open, index, onIndexChange, onClose }: MediaLightboxProps) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false });
  useScrollLock(open);
  useFocusTrap(root, open, onClose);

  const clampOffset = (x: number, y: number, scale: number) => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (!bounds) return { x, y };
    const maxX = ((scale - 1) * bounds.width) / 2;
    const maxY = ((scale - 1) * bounds.height) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };

  const setZoomAt = (next: number, clientX?: number, clientY?: number) => {
    const scale = Math.max(1, Math.min(MAX_ZOOM, next));
    const bounds = viewport.current?.getBoundingClientRect();
    if (scale === 1 || !bounds) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    // Amplía hacia el punto señalado.
    const px = clientX === undefined ? 0 : clientX - (bounds.left + bounds.width / 2);
    const py = clientY === undefined ? 0 : clientY - (bounds.top + bounds.height / 2);
    setZoom(scale);
    setOffset(clampOffset(-px * (scale - 1), -py * (scale - 1), scale));
  };

  const go = (direction: 1 | -1) => {
    setZoomAt(1);
    onIndexChange((index + direction + media.length) % media.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === '+' || event.key === '=') setZoomAt(zoom + STEP);
      else if (event.key === '-') setZoomAt(zoom - STEP);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onPointerDown = (event: ReactPointerEvent) => {
    drag.current = { x: offset.x, y: offset.y, startX: event.clientX, startY: event.clientY, moved: false };
    if (zoom > 1) {
      setDragging(true);
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
    if (dragging) setOffset(clampOffset(drag.current.x + dx, drag.current.y + dy, zoom));
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    setDragging(false);
    const { moved, startX } = drag.current;
    if (!moved) {
      setZoomAt(zoom > 1 ? 1 : CLICK_ZOOM, event.clientX, event.clientY);
    } else if (zoom === 1 && Math.abs(event.clientX - startX) > 60) {
      go(event.clientX < startX ? 1 : -1); // deslizar para cambiar de imagen
    }
  };

  const current = media[index];

  return (
    <div
      ref={root}
      className={styles.root}
      data-open={open}
      inert={!open}
      role="dialog"
      aria-modal="true"
      aria-label={`Galería ampliada de ${product.name}`}
      tabIndex={-1}
    >
      <div
        ref={viewport}
        className={styles.viewport}
        data-zoomed={zoom > 1}
        data-dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragging(false)}
        onWheel={(event) => setZoomAt(zoom - event.deltaY * 0.004, event.clientX, event.clientY)}
      >
        {open && current && (
          <div className={styles.image} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }}>
            <div className={styles.frame}>
              <ProductMedia product={product} media={current} colorId={colorId} sizes="(min-width: 768px) 70vh, 100vw" />
            </div>
          </div>
        )}
      </div>

      {/* Contador, zoom y cierre en una sola píldora de cristal. */}
      <LiquidGlass radius="pill" bezel={22} refraction={24} tone="light" className={styles.bar}>
        <span className={styles.counter} aria-live="polite">
          {index + 1} / {media.length}
        </span>
        <span className={styles.divider} aria-hidden="true" />
        <button type="button" className={styles.tool} aria-label="Reducir" title="Reducir" onClick={() => setZoomAt(zoom - STEP)} disabled={zoom <= 1}>
          <Minus aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Ampliar"
          title="Ampliar"
          onClick={() => setZoomAt(zoom + STEP)}
          disabled={zoom >= MAX_ZOOM}
        >
          <Plus aria-hidden="true" />
        </button>
        <button type="button" className={styles.tool} aria-label="Cerrar galería" title="Cerrar galería" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </LiquidGlass>

      {media.length > 1 && (
        <>
          <LiquidGlass
            as="button"
            type="button"
            radius="pill"
            bezel={24}
            refraction={28}
            tone="light"
            className={`${styles.nav} ${styles.prev}`}
            aria-label="Imagen anterior"
            onClick={() => go(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </LiquidGlass>
          <LiquidGlass
            as="button"
            type="button"
            radius="pill"
            bezel={24}
            refraction={28}
            tone="light"
            className={`${styles.nav} ${styles.next}`}
            aria-label="Imagen siguiente"
            onClick={() => go(1)}
          >
            <ChevronRight aria-hidden="true" />
          </LiquidGlass>

          <LiquidGlass radius="pill" bezel={18} refraction={22} tone="light" className={styles.thumbs}>
            {media.map((item, position) => (
              <button
                key={position}
                type="button"
                className={styles.thumb}
                aria-current={position === index}
                aria-label={`Ver imagen ${position + 1}`}
                onClick={() => {
                  setZoomAt(1);
                  onIndexChange(position);
                }}
              >
                <ProductMedia product={product} media={item} colorId={colorId} decorative sizes="48px" />
              </button>
            ))}
          </LiquidGlass>
        </>
      )}
    </div>
  );
}
