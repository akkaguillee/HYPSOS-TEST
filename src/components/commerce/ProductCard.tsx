import { Price } from '@/components/ui/Price';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { useProductHoverGL } from '@/lib/gl/useProductHoverGL';
import { mediaForColor } from '@/lib/product-media';
import { useCart } from '@/store/cart';
import { useStock } from '@/store/inventory';
import { useUi } from '@/store/ui';
import { getStock, isColorAvailable, isProductAvailable, variantSku } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';
import { useRef, useState } from 'react';
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
  /** En listados de novedades la etiqueta «Nuevo» sobra. */
  hideNewBadge?: boolean;
}

/**
 * Tarjeta de producto: imagen limpia sobre el fondo de estudio (trasera al pasar el cursor),
 * código técnico del producto, nombre, precio y tallas del color elegido, con las agotadas
 * tachadas. Toda la tarjeta enlaza a la ficha; añadido rápido con puntero fino.
 * Con puntero fino y WebGL, el paso a la trasera es una transición líquida con lupa e inclinación
 * (src/lib/gl); si no, el fundido CSS de siempre.
 */
export function ProductCard({ product, priority, sizes, headingLevel: Heading = 'h3', hideNewBadge }: ProductCardProps) {
  const { known, lookup } = useStock();
  const firstAvailable = product.colors.find((color) => isColorAvailable(product, color.id, lookup)) ?? product.colors[0];
  const [chosenColor, setChosenColor] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  useProductHoverGL(cardRef, { mode: 'swap' });
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
    <article ref={cardRef} className={cn(styles.card, !available && styles.soldOut)}>
      <div className={styles.media} data-product-media="">
        <ProductMedia product={product} media={media[0]} colorId={colorId} className={styles.mediaLayer} sizes={sizes} priority={priority} />
        {media[1] && (
          <span aria-hidden="true">
            <ProductMedia product={product} media={media[1]} colorId={colorId} className={cn(styles.mediaLayer, styles.mediaBack)} sizes={sizes} decorative />
          </span>
        )}
        <ProductBadges product={product} hideNew={hideNewBadge} />
        <WishlistButton product={product} />
        {available && known && (
          <div className={`glass glass--strong ${styles.quickAdd}`} data-theme="dark" data-gl-calm="">
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
        <p className={styles.code}>{product.code}</p>
        <Heading className={styles.title}>
          {/* El enlace estirado cubre la imagen: es lo que recibe el cursor (anillo «Ver»). */}
          <Link to={url} className={styles.titleLink} data-cursor="view" viewTransition>
            {product.name}
          </Link>
        </Heading>
        <Price amount={product.price} compareAt={product.compareAtPrice} className={styles.price} />
        <div className={styles.meta}>
          {product.colors.length > 1 && (
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
          )}
          {/* Agotado: lo indica la etiqueta de la imagen; no se repite aquí. */}
          {available && product.sizes.length > 1 && (
            <p className={styles.sizes}>
              <span className="visually-hidden">Tallas en {color.name.toLowerCase()}: </span>
              {product.sizes.map((size) => {
                const inStock = !known || getStock(product, colorId, size, lookup) > 0;
                return (
                  <span key={size} className={styles.size} data-out={!inStock || undefined}>
                    {size}
                    {!inStock && <span className="visually-hidden"> (agotada)</span>}{' '}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
