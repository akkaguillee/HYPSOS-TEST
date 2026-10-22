import { mascotVector } from '@/assets/brand/mascot';
import { monogramVector } from '@/assets/brand/monogram';
import { starVector } from '@/assets/brand/star';
import { wordmarkVector } from '@/assets/brand/wordmark';
import { cn } from '@/lib/cn';
import { useId, type CSSProperties } from 'react';
import styles from './Sticker.module.css';

const vectors = { mascot: mascotVector, monogram: monogramVector, star: starVector, wordmark: wordmarkVector } as const;

export type StickerMark = keyof typeof vectors;

interface StickerProps {
  mark: StickerMark;
  /** Color de la marca (la mascota conserva su silueta negra y su trazo claro). */
  color?: string;
  /** Giro en grados: el sticker es un objeto pegado, no el logotipo (que nunca se gira). */
  rotate?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * Pegatina troquelada con una marca oficial de HYPSOS: borde blanco roto y contorno negro de
 * 1 px generados con filtros SVG a partir de la propia forma (sin redibujarla ni deformarla).
 * Es la versión digital del HYPOSTICKER SET del Manual de Marca.
 */
export function Sticker({ mark, color = 'currentColor', rotate = 0, className, style, title }: StickerProps) {
  const id = useId().replace(/:/g, '');
  const def = vectors[mark];
  const [, , w, h] = def.viewBox.split(' ').map(Number);
  const size = Math.max(w, h);
  const border = size * 0.045;
  const outline = size * 0.008;
  const pad = border + outline * 2;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}
      className={cn(styles.sticker, className)}
      style={{ ...style, '--sticker-rotate': `${rotate}deg` } as CSSProperties}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`die-${id}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius={border} result="cut" />
          <feMorphology in="SourceAlpha" operator="dilate" radius={border + outline} result="edge" />
          <feFlood floodColor="#090909" result="ink" />
          <feComposite in="ink" in2="edge" operator="in" result="outline" />
          <feFlood floodColor="#f2f0ec" result="paper" />
          <feComposite in="paper" in2="cut" operator="in" result="backing" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="backing" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#die-${id})`}>
        <g transform={def.transform}>
          {mark === 'mascot' && <path d={mascotVector.fill} fill="#090909" />}
          <path d={def.d} fill={mark === 'mascot' ? '#f2f0ec' : color} />
        </g>
      </g>
    </svg>
  );
}
