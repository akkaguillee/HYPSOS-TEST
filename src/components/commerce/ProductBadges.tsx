import { productBadges } from '@/lib/product-media';
import { useStock } from '@/store/inventory';
import type { Product } from '@shared/types';
import styles from './ProductCard.module.css';

/**
 * `surface="page"`: sobre el fondo de la página (fuera de la imagen de estudio).
 * `edition`: en la ficha, la tirada se dice una sola vez junto a la etiqueta («Edición limitada · 200 uds»).
 */
export function ProductBadges({
  product,
  className,
  surface = 'image',
  hideNew,
  edition,
}: {
  product: Product;
  className?: string;
  surface?: 'image' | 'page';
  hideNew?: boolean;
  edition?: number;
}) {
  const { known, live } = useStock();
  const badges = productBadges(product, known ? live : null, { hideNew });
  if (badges.length === 0) return null;
  return (
    <ul role="list" className={`${styles.badges} ${className ?? ''}`} data-surface={surface}>
      {badges.map((badge) => (
        <li key={badge.id} className={styles.badge} data-tone={badge.tone}>
          {badge.label}
          {badge.id === 'limitada' && edition ? ` / ${edition} uds` : null}
        </li>
      ))}
    </ul>
  );
}
