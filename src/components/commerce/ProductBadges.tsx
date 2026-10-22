import { productBadges } from '@/lib/product-media';
import { useStock } from '@/store/inventory';
import type { Product } from '@shared/types';
import styles from './ProductCard.module.css';

/** `surface="page"`: sobre el fondo oscuro de la página (fuera de la imagen de estudio). */
export function ProductBadges({
  product,
  className,
  surface = 'image',
  hideNew,
}: {
  product: Product;
  className?: string;
  surface?: 'image' | 'page';
  hideNew?: boolean;
}) {
  const { known, live } = useStock();
  const badges = productBadges(product, known ? live : null, { hideNew });
  if (badges.length === 0) return null;
  return (
    <ul role="list" className={`${styles.badges} ${className ?? ''}`} data-surface={surface}>
      {badges.map((badge) => (
        <li key={badge.id} className={styles.badge} data-tone={badge.tone}>
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
