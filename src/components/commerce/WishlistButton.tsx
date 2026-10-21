import { cn } from '@/lib/cn';
import { useUi } from '@/store/ui';
import { useWishlist } from '@/store/wishlist';
import type { Product } from '@shared/types';
import { Heart } from 'lucide-react';
import styles from './ProductCard.module.css';

export function WishlistButton({ product, className, withLabel = false }: { product: Product; className?: string; withLabel?: boolean }) {
  const saved = useWishlist((state) => state.productIds.includes(product.id));
  const toggle = useWishlist((state) => state.toggle);
  const announce = useUi((state) => state.announce);

  return (
    <button
      type="button"
      className={cn(withLabel ? styles.wishlistWide : styles.wishlist, className)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? `Quitar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`}
      onClick={() => {
        const added = toggle(product.id);
        announce(added ? `${product.name} guardado en favoritos` : `${product.name} eliminado de favoritos`);
      }}
    >
      <Heart aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      {withLabel && <span>{saved ? 'Guardado' : 'Favoritos'}</span>}
    </button>
  );
}
