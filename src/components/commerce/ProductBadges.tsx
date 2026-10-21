import { productBadges } from '@/lib/product-media';
import { useStock } from '@/store/inventory';
import type { Product } from '@shared/types';
import styles from './ProductCard.module.css';

export function ProductBadges({ product, className }: { product: Product; className?: string }) {
  const { known, live } = useStock();
  const badges = productBadges(product, known ? live : null);
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
