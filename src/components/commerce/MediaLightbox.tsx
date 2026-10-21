import { IconButton } from '@/components/ui/Button';
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

const MAX_ZOOM = 3;

/**
 * Galería a pantalla completa con zoom: clic/toque para ampliar en el punto señalado,
 * arrastre para desplazarse, rueda o botones +/− y teclado (flechas, +, −, Escape).
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
      else if (event.key === '+' || event.key === '=') setZoomAt(zoom + 0.75);
      else if (event.key === '-') setZoomAt(zoom - 0.75);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fromControl = (event: ReactPointerEvent) => Boolean((event.target as Element).closest('button'));

  const onPointerDown = (event: ReactPointerEvent) => {
    if (fromControl(event)) return;
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
    if (fromControl(event)) return;
    setDragging(false);
    const { moved, startX } = drag.current;
    if (!moved) {
      setZoomAt(zoom > 1 ? 1 : 2.2, event.clientX, event.clientY);
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
      <div className={styles.bar}>
        <span className={styles.counter} aria-live="polite">
          {index + 1} / {media.length}
        </span>
        <div className={styles.tools}>
          <IconButton label="Reducir" onClick={() => setZoomAt(zoom - 0.75)} disabled={zoom <= 1}>
            <Minus aria-hidden="true" />
          </IconButton>
          <IconButton label="Ampliar" onClick={() => setZoomAt(zoom + 0.75)} disabled={zoom >= MAX_ZOOM}>
            <Plus aria-hidden="true" />
          </IconButton>
          <IconButton label="Cerrar galería" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </div>
      </div>

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
            <ProductMedia product={product} media={current} colorId={colorId} sizes="100vw" />
          </div>
        )}
        {media.length > 1 && (
          <>
            <IconButton label="Imagen anterior" className={`${styles.nav} ${styles.prev}`} onClick={() => go(-1)}>
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <IconButton label="Imagen siguiente" className={`${styles.nav} ${styles.next}`} onClick={() => go(1)}>
              <ChevronRight aria-hidden="true" />
            </IconButton>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className={styles.thumbs}>
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
        </div>
      )}
    </div>
  );
}
