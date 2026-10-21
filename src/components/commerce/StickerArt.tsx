import { mascotVector } from '@/assets/brand/mascot';
import { starVector } from '@/assets/brand/star';
import { wordmarkVector } from '@/assets/brand/wordmark';
import type { MediaView, Product } from '@shared/types';
import { useId } from 'react';

/**
 * Vista previa digital de un sticker a partir del recurso OFICIAL de marca:
 * troquelado blanco generado con un filtro SVG (dilatación del contorno) y sombra suave.
 * No es una fotografía del producto: se rotula como «Vista previa».
 */
export function StickerArt({ product, colorId, view = 'front', className, compact = false, decorative = false }: {
  product: Product;
  colorId?: string;
  view?: MediaView;
  className?: string;
  compact?: boolean;
  decorative?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const color = product.colors.find((candidate) => candidate.id === colorId) ?? product.colors[0];
  const zoom = view === 'detail';
  const tilt = view === 'back' ? 6 : -4;

  const art = (() => {
    switch (product.artwork) {
      case 'mascot':
        return (
          <svg x="70" y="120" width="260" height="215" viewBox={mascotVector.viewBox}>
            <g transform={mascotVector.transform}>
              <path d={mascotVector.fill} fill="#000" />
              <path d={mascotVector.d} fill="#f5f5f5" />
            </g>
          </svg>
        );
      case 'star':
        return (
          <svg x="40" y="170" width="320" height="160" viewBox={starVector.viewBox}>
            <g transform={starVector.transform}>
              <path d={starVector.d} fill={color.hex} />
            </g>
          </svg>
        );
      default:
        return (
          <svg x="50" y="200" width="300" height="68" viewBox={wordmarkVector.viewBox}>
            <g transform={wordmarkVector.transform}>
              <path d={wordmarkVector.d} fill="#080808" />
            </g>
          </svg>
        );
    }
  })();

  return (
    <svg
      viewBox={zoom ? '100 140 200 250' : '0 0 400 500'}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Vista previa digital del ${product.name}.`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id={`${id}-cut`} x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="spread" />
          <feFlood floodColor="#f5f5f5" />
          <feComposite in2="spread" operator="in" result="border" />
          <feGaussianBlur in="spread" stdDeviation="8" result="blur" />
          <feOffset in="blur" dy="10" result="offset" />
          <feFlood floodColor="#000" floodOpacity="0.55" />
          <feComposite in2="offset" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={`${id}-mat`} width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M25 0H0V25" fill="none" stroke="rgb(245 245 245 / 0.05)" />
        </pattern>
      </defs>
      <rect width="400" height="500" fill="#161616" />
      <rect width="400" height="500" fill={`url(#${id}-mat)`} />
      <g transform={`rotate(${tilt} 200 250)`} filter={`url(#${id}-cut)`}>
        {art}
      </g>
      {!compact && (
        <g fontFamily="Inter Variable, Inter, system-ui, sans-serif" fontWeight="600" letterSpacing="1.4" fill="rgb(245 245 245 / 0.45)">
          <text x="20" y="470" fontSize="11">
            {product.code} · VISTA PREVIA DIGITAL
          </text>
          <text x="20" y="486" fontSize="11">
            FOTOGRAFÍA PENDIENTE
          </text>
          <circle cx="374" cy="481" r="3.5" fill="#c8102e" />
        </g>
      )}
    </svg>
  );
}
