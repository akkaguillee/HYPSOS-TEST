import { Price } from '@/components/ui/Price';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { useCart, type ResolvedCartLine } from '@/store/cart';
import { useUi } from '@/store/ui';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './Cart.module.css';
import { mediaForColor } from '@/lib/product-media';
import { ProductMedia } from './ProductMedia';

export function CartLineItem({ line, onNavigate }: { line: ResolvedCartLine; onNavigate?: () => void }) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const announce = useUi((state) => state.announce);
  const href = `${paths.product(line.product.handle)}?color=${line.colorId}`;
  const outOfStock = line.maxQuantity === 0;

  return (
    <li className={styles.line}>
      <Link to={href} className={styles.thumb} onClick={onNavigate} tabIndex={-1} aria-hidden="true" viewTransition>
        <ProductMedia product={line.product} media={mediaForColor(line.product, line.colorId)[0]} colorId={line.colorId} decorative sizes="88px" />
      </Link>
      <div className={styles.lineBody}>
        <div className={styles.lineHead}>
          <Link to={href} onClick={onNavigate} viewTransition>
            {line.product.name}
          </Link>
          <Price amount={line.lineTotal} />
        </div>
        <p className={styles.lineMeta}>
          {line.colorName} · Talla {line.size}
          {line.quantity > 1 && (
            <>
              {' '}
              · <Price amount={line.unitPrice} /> / ud.
            </>
          )}
        </p>
        {outOfStock && <p className={styles.stockNote}>Esta variante se ha agotado. Elimínala para continuar.</p>}
        {!outOfStock && line.quantity >= line.maxQuantity && (
          <p className={styles.lineMeta}>Máximo disponible: {line.maxQuantity}</p>
        )}
        <div className={styles.lineActions}>
          <QuantityStepper
            value={line.quantity}
            max={line.maxQuantity}
            onChange={(quantity) => setQuantity(line.id, quantity)}
            label={`${line.product.name}, ${line.colorName}, talla ${line.size}`}
          />
          <button
            type="button"
            className={styles.remove}
            onClick={() => {
              remove(line.id);
              announce(`${line.product.name} eliminado del carrito`);
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </li>
  );
}
