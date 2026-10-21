import type { Ref } from 'react';

interface ChromeMonogramProps {
  className?: string;
  /** Imagen principal de la vista: se carga con prioridad. */
  priority?: boolean;
  sizes?: string;
  alt?: string;
  ref?: Ref<HTMLImageElement>;
}

const widths = [640, 1080, 1480];
const srcSet = (format: 'avif' | 'webp') =>
  widths.map((width) => `/assets/brand/monogram-chrome-${width}.${format} ${Math.min(width, 1479)}w`).join(', ');

/** Monograma H cromado oficial (render sobre negro). */
export function ChromeMonogram({
  className,
  priority = false,
  sizes = '(min-width: 1024px) 60vw, 100vw',
  alt = 'Monograma H de HYPSOS en acabado cromado',
  ref,
}: ChromeMonogramProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        ref={ref}
        className={className}
        src="/assets/brand/monogram-chrome-1080.webp"
        width={1479}
        height={1064}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}
