import { campaignSrcSet, type CampaignPhoto } from '@shared/campaign';
import type { CSSProperties } from 'react';

interface CampaignImageProps {
  photo: CampaignPhoto;
  sizes: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  /** Punto focal (object-position) para recortes en distintos formatos. */
  focus?: string;
  style?: CSSProperties;
}

/**
 * Foto de campaña en AVIF con WebP de reserva. Las imágenes actuales están generadas con IA
 * (provisionales, ver shared/campaign.ts); el texto alternativo describe la escena.
 */
export function CampaignImage({ photo, sizes, className, priority, decorative, focus, style }: CampaignImageProps) {
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={campaignSrcSet(photo, 'avif')} sizes={sizes} />
      <img
        src={`${photo.base}-${photo.widths.at(-1)}.webp`}
        srcSet={campaignSrcSet(photo, 'webp')}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={decorative ? '' : photo.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        draggable={false}
        style={{ objectFit: 'cover', objectPosition: focus, ...style }}
      />
    </picture>
  );
}
