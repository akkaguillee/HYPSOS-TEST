import { mockupSrc } from '@shared/catalog';
import type { MediaView, Product, ProductMedia as Media } from '@shared/types';

interface ProductMediaProps {
  product: Product;
  media: Media;
  colorId?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  decorative?: boolean;
}

const VIEW_LABEL: Record<MediaView, string> = { front: 'delantera', back: 'trasera', detail: 'detalle' };

/** Fotografía real del producto o, mientras no exista, su mockup digital 2D (WebP 480/960). */
export function ProductMedia({ product, media, colorId, className, sizes = '(min-width: 1024px) 25vw, 50vw', priority, decorative }: ProductMediaProps) {
  const loading = priority ? 'eager' : 'lazy';
  if (media.type === 'image') {
    return (
      <img
        src={media.src}
        alt={decorative ? '' : media.alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        className={className}
        loading={loading}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        style={{ objectFit: 'cover' }}
      />
    );
  }
  const color = product.colors.find((candidate) => candidate.id === colorId) ?? product.colors[0];
  return (
    <img
      src={mockupSrc(product, color.id, media.view, 960)}
      srcSet={`${mockupSrc(product, color.id, media.view, 480)} 480w, ${mockupSrc(product, color.id, media.view, 960)} 960w`}
      sizes={sizes}
      alt={decorative ? '' : `Mockup digital de ${product.name} en ${color.name.toLowerCase()}, vista ${VIEW_LABEL[media.view]}`}
      width={960}
      height={1200}
      className={className}
      loading={loading}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      style={{ objectFit: 'cover' }}
    />
  );
}
