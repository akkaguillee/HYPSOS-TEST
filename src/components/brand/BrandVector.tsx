import { mascotVector } from '@/assets/brand/mascot';
import { monogramVector } from '@/assets/brand/monogram';
import { starVector } from '@/assets/brand/star';
import { wordmarkVector } from '@/assets/brand/wordmark';
import type { CSSProperties } from 'react';

interface VectorDef {
  readonly viewBox: string;
  readonly transform: string;
  readonly d: string;
}

interface BrandVectorProps {
  className?: string;
  style?: CSSProperties;
  /** Texto accesible. Sin él, el gráfico se oculta a lectores de pantalla. */
  title?: string;
}

/**
 * Recursos oficiales de HYPSOS como SVG en línea (trazados desde los archivos
 * originales, ver scripts/process-brand-assets.mjs). Se pintan con `currentColor`
 * para poder presentarlos sobre fondos claros u oscuros sin alterar su forma.
 */
function BrandVector({ def, className, style, title }: BrandVectorProps & { def: VectorDef }) {
  return (
    <svg
      viewBox={def.viewBox}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={def.transform}>
        <path d={def.d} fill="currentColor" />
      </g>
    </svg>
  );
}

export const Wordmark = (props: BrandVectorProps) => <BrandVector def={wordmarkVector} {...props} />;
export const Monogram = (props: BrandVectorProps) => <BrandVector def={monogramVector} {...props} />;
export const Star = (props: BrandVectorProps) => <BrandVector def={starVector} {...props} />;
/**
 * Mascota: trazo en `currentColor` (blanco por defecto, como en el original) sobre su silueta
 * rellena en café, igual que el archivo oficial, para que se lea sobre cualquier superficie.
 * Plana: sin troquel ni sombra.
 */
export function Mascot({ className, style, title }: BrandVectorProps) {
  return (
    <svg
      viewBox={mascotVector.viewBox}
      className={className}
      style={{ color: 'var(--c-white)', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={mascotVector.transform}>
        <path d={mascotVector.fill} fill="var(--c-coffee)" />
        <path d={mascotVector.d} fill="currentColor" />
      </g>
    </svg>
  );
}

