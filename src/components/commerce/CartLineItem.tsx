import { Price } from '@/components/ui/Price';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { useCart, type ResolvedCartLine } from '@/store/cart';
import { useUi } from '@/store/ui';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './Cart.module.css';
import { mediaForColor } from '@/lib/product-media';
import { ProductMedia } from './ProductMedia';

interface CartLineItemProps {
  line: ResolvedCartLine;
  onNavigate?: () => void;
  /** `drawer`: cajón del carrito. `page`: página del carrito (miniatura mayor). */
  variant?: 'drawer' | 'page';
}

export function CartLineItem({ line, onNavigate, variant = 'drawer' }: CartLineItemProps) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const announce = useUi((state) => state.announce);
  const href = `${paths.product(line.product.handle)}?color=${line.colorId}`;
  const outOfStock = line.maxQuantity === 0;

  return (
    <li className={styles.line} data-variant={variant} data-out={outOfStock || undefined}>
      <Link to={href} className={styles.thumb} onClick={onNavigate} tabIndex={-1} aria-hidden="true" viewTransition>
        <ProductMedia
          product={line.product}
          media={mediaForColor(line.product, line.colorId)[0]}
          colorId={line.colorId}
          decorative
          sizes={variant === 'page' ? '128px' : '88px'}
        />
      </Link>
      <div className={styles.lineBody}>
        <div className={styles.lineHead}>
          <div className={styles.lineInfo}>
            <p className={styles.lineCode}>{line.product.code}</p>
            <Link to={href} onClick={onNavigate} className={styles.lineName} viewTransition>
              {line.product.name}
            </Link>
            <p className={styles.lineMeta}>
              {line.colorName} / Talla {line.size}
            </p>
            {line.quantity > 1 && (
              <p className={styles.lineMeta}>
                <Price amount={line.unitPrice} /> / ud.
              </p>
            )}
          </div>
          <Price amount={line.lineTotal} className={styles.linePrice} />
        </div>
        {outOfStock && <p className={styles.stockNote}>Esta variante se ha agotado. Elimínala para continuar.</p>}
        {!outOfStock && line.quantity >= line.maxQuantity && (
          <p className={styles.lineMeta}>Máximo disponible: {line.maxQuantity}</p>
        )}
        <div className={styles.lineActions}>
          <div className={styles.stepper}>
            <QuantityStepper
              value={line.quantity}
              max={line.maxQuantity}
              onChange={(quantity) => setQuantity(line.id, quantity)}
              label={`${line.product.name}, ${line.colorName}, talla ${line.size}`}
            />
          </div>
          <button
            type="button"
            className={styles.remove}
            onClick={() => {
              remove(line.id);
              announce(`${line.product.name} eliminado del carrito`);
            }}
          >
            Eliminar<span className="visually-hidden"> {line.product.name}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
