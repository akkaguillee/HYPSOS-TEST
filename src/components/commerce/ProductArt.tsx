import type { MediaView, Product } from '@shared/types';
import { useId } from 'react';
import { silhouettes } from './silhouettes';
import { StickerArt } from './StickerArt';

interface ProductArtProps {
  product: Product;
  colorId?: string;
  view?: MediaView;
  className?: string;
  /** Oculta las anotaciones (miniaturas pequeñas). */
  compact?: boolean;
  /** Miniatura junto al nombre del producto: se oculta a lectores de pantalla. */
  decorative?: boolean;
}

const VIEW_LABEL: Record<MediaView, string> = { front: 'Delantera', back: 'Trasera', detail: 'Detalle' };

function isLight(hex: string): boolean {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

/**
 * MARCADOR DE POSICIÓN de producto: boceto técnico vectorial de la prenda en el
 * color seleccionado. Se identifica claramente como "imagen pendiente" y se
 * sustituye automáticamente cuando el producto tiene fotografías (`type: 'image'`).
 */
export function ProductArt(props: ProductArtProps) {
  // Los stickers se previsualizan con el gráfico oficial de marca que reproducen.
  if (props.product.artwork) return <StickerArt {...props} />;
  return <GarmentSketch {...props} />;
}

function GarmentSketch({ product, colorId, view = 'front', className, compact = false, decorative = false }: ProductArtProps) {
  const patternId = useId();
  const color = product.colors.find((candidate) => candidate.id === colorId) ?? product.colors[0];
  const shape = silhouettes[product.silhouette];
  const light = isLight(color.hex);
  const details = view === 'back' && shape.backDetails ? shape.backDetails : shape.details;
  const [bx, by, bw, bh] = shape.detailBox;
  // La vista de detalle amplía una zona; el resto encuadra la prenda completa.
  const viewBox = view === 'detail' ? `${bx} ${by} ${bw} ${bh * 1.25}` : '0 0 400 500';

  return (
    <svg
      viewBox="0 0 400 500"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Imagen pendiente. Boceto de ${product.name}, color ${color.name}, vista ${VIEW_LABEL[view].toLowerCase()}.`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgb(255 255 255 / 0.035)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="500" fill="#141414" />
      <rect width="400" height="500" fill={`url(#${patternId})`} />
      <svg x="28" y="44" width="344" height="400" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" overflow="visible">
        <g transform={view === 'back' ? 'translate(400 0) scale(-1 1)' : undefined}>
          <path
            d={shape.outline}
            fill={color.hex}
            fillRule="evenodd"
            stroke={light ? 'rgb(0 0 0 / 0.25)' : 'rgb(255 255 255 / 0.22)'}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {details.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={light ? 'rgb(0 0 0 / 0.32)' : 'rgb(255 255 255 / 0.2)'}
              strokeWidth={1.2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
      {!compact && (
        <g fontFamily="Inter Variable, Inter, system-ui, sans-serif" fontWeight="600" letterSpacing="1.4" fill="rgb(255 255 255 / 0.42)">
          <text x="20" y="470" fontSize="11">
            {product.code} · {VIEW_LABEL[view].toUpperCase()}
          </text>
          <text x="20" y="486" fontSize="11">
            IMAGEN PENDIENTE
          </text>
          <circle cx="374" cy="481" r="3.5" fill="#c8102e" />
        </g>
      )}
    </svg>
  );
}
