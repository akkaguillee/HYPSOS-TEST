import { Price } from '@/components/ui/Price';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { mediaForColor } from '@/lib/product-media';
import { useCart } from '@/store/cart';
import { useStock } from '@/store/inventory';
import { useUi } from '@/store/ui';
import { getStock, isColorAvailable, isProductAvailable, variantSku } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';
import { useState } from 'react';
import { Link } from 'react-router';
import { ProductBadges } from './ProductBadges';
import styles from './ProductCard.module.css';
import { ProductMedia } from './ProductMedia';
import { WishlistButton } from './WishlistButton';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  sizes?: string;
  headingLevel?: 'h2' | 'h3';
}

export function ProductCard({ product, priority, sizes, headingLevel: Heading = 'h3' }: ProductCardProps) {
  const { known, lookup } = useStock();
  const firstAvailable = product.colors.find((color) => isColorAvailable(product, color.id, lookup)) ?? product.colors[0];
  const [chosenColor, setChosenColor] = useState<string | null>(null);
  const colorId = chosenColor ?? firstAvailable.id;
  const add = useCart((state) => state.add);
  const openCart = useCart((state) => state.open);
  const announce = useUi((state) => state.announce);
  const available = !known || isProductAvailable(product, lookup);
  const media = mediaForColor(product, colorId);
  const url = `${paths.product(product.handle)}${colorId !== product.colors[0].id ? `?color=${colorId}` : ''}`;
  const color = product.colors.find((candidate) => candidate.id === colorId)!;

  const quickAdd = (size: string) => {
    const added = add({ productId: product.id, colorId, size, quantity: 1 });
    if (added > 0) {
      track('add_to_cart', { item_id: product.id, variant: variantSku(product, colorId, size), price: product.price / 100, quantity: 1 });
      announce(`${product.name}, ${color.name}, talla ${size}, añadido al carrito`);
      openCart();
    }
  };

  return (
    <article className={cn(styles.card, !available && styles.soldOut)}>
      <div className={styles.media}>
        <ProductMedia product={product} media={media[0]} colorId={colorId} className={styles.mediaLayer} sizes={sizes} priority={priority} />
        {media[1] && (
          <span aria-hidden="true">
            <ProductMedia product={product} media={media[1]} colorId={colorId} className={cn(styles.mediaLayer, styles.mediaBack)} sizes={sizes} decorative />
          </span>
        )}
        <ProductBadges product={product} />
        <WishlistButton product={product} />
        {available && known && (
          <div className={styles.quickAdd}>
            <p className={styles.quickLabel}>Añadido rápido · {color.name}</p>
            <div className={styles.quickSizes}>
              {product.sizes.map((size) => {
                const inStock = getStock(product, colorId, size, lookup) > 0;
                return (
                  <button
                    key={size}
                    type="button"
                    className={styles.quickSize}
                    disabled={!inStock}
                    onClick={() => quickAdd(size)}
                    aria-label={`Añadir ${product.name}, ${color.name}, talla ${size}${inStock ? '' : ' (agotada)'}`}
                  >
                    {size === 'Única' ? 'Añadir' : size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className={styles.info}>
        <Heading className={styles.title}>
          <Link to={url} className={styles.titleLink} viewTransition>
            {product.name}
          </Link>
        </Heading>
        <Price amount={product.price} compareAt={product.compareAtPrice} className={styles.price} />
        <div className={styles.meta}>
          {product.colors.length > 1 ? (
            <div className={styles.swatches} role="group" aria-label={`Colores de ${product.name}`}>
              {product.colors.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.swatch}
                  aria-pressed={option.id === colorId}
                  aria-label={`Ver en ${option.name}`}
                  onClick={() => setChosenColor(option.id)}
                >
                  <span style={{ background: option.hex }} />
                </button>
              ))}
            </div>
          ) : (
            <span>{product.colors[0].name}</span>
          )}
          {!available && <span>Agotado</span>}
        </div>
      </div>
    </article>
  );
}
