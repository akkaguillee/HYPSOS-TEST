import type { Product, ProductMedia as Media } from '@shared/types';
import { ProductArt } from './ProductArt';

interface ProductMediaProps {
  product: Product;
  media: Media;
  colorId?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  compact?: boolean;
  decorative?: boolean;
}

/** Renderiza una fotografía real o, si aún no existe, el marcador de posición técnico. */
export function ProductMedia({
  product,
  media,
  colorId,
  className,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  priority,
  compact,
  decorative,
}: ProductMediaProps) {
  if (media.type === 'image') {
    return (
      <img
        src={media.src}
        alt={decorative ? '' : media.alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={{ objectFit: 'cover' }}
      />
    );
  }
  return <ProductArt product={product} colorId={colorId} view={media.view} className={className} compact={compact} decorative={decorative} />;
}

