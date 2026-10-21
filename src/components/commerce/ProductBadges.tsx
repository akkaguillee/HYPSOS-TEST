import { productBadges } from '@/lib/product-media';
import type { Product } from '@shared/types';
import styles from './ProductCard.module.css';

export function ProductBadges({ product, className }: { product: Product; className?: string }) {
  const badges = productBadges(product);
  if (badges.length === 0) return null;
  return (
    <ul role="list" className={`${styles.badges} ${className ?? ''}`}>
      {badges.map((badge) => (
        <li key={badge.id} className={styles.badge} data-tone={badge.tone}>
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
