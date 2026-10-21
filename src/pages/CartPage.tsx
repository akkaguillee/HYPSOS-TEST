import { CartLineItem } from '@/components/commerce/CartLineItem';
import { FreeShippingProgress } from '@/components/commerce/FreeShippingProgress';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { cartCount, cartSubtotal, resolveCartLines, useCart } from '@/store/cart';
import { useInventory, useStock } from '@/store/inventory';
import { paths } from '@shared/routes';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import cartStyles from '@/components/commerce/Cart.module.css';
import styles from './CartPage.module.css';

export default function CartPage() {
  const rawLines = useCart((state) => state.lines);
  const { lookup } = useStock();
  const loadInventory = useInventory((state) => state.load);
  const lines = useMemo(() => resolveCartLines(rawLines, lookup), [rawLines, lookup]);
  useEffect(() => {
    void loadInventory(true);
  }, [loadInventory]);
  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);
  const navigate = useNavigate();
  const blocked = lines.some((line) => line.maxQuantity === 0);

  return (
    <>
      <PageHeader
        title="Carrito"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Carrito' }]}
        aside={count > 0 ? `${count} ${count === 1 ? 'artículo' : 'artículos'}` : undefined}
      />
      <div className="container">
        {lines.length === 0 ? (
          <div className={styles.empty}>
            <p className="t-h3">Tu carrito está vacío</p>
            <p className="t-muted">Cuando añadas productos aparecerán aquí.</p>
            <ButtonLink to={paths.collection('all')}>Ir a la tienda</ButtonLink>
          </div>
        ) : (
          <div className={styles.layout}>
            <ul role="list" className={`${cartStyles.lines} ${styles.lines}`}>
              {lines.map((line) => (
                <CartLineItem key={line.id} line={line} />
              ))}
            </ul>
            <aside className={styles.summary} aria-labelledby="cart-summary-title">
              <h2 id="cart-summary-title" className={styles.summaryTitle}>
                Resumen
              </h2>
              <div className={styles.shippingBox}>
                <FreeShippingProgress subtotal={subtotal} />
              </div>
              <div className={styles.row}>
                <span>Subtotal</span>
                <Price amount={subtotal} />
              </div>
              <div className={styles.row}>
                <span>Envío</span>
                <span className="t-muted">Se calcula en el checkout</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total estimado</span>
                <Price amount={subtotal} />
              </div>
              <p className={styles.note}>IVA incluido.</p>
              <Button size="lg" block sheen disabled={blocked} onClick={() => navigate(paths.checkout, { viewTransition: true })}>
                Finalizar compra
              </Button>
              {blocked && <p className={styles.note}>Elimina los productos agotados para continuar.</p>}
              <ButtonLink to={paths.collection('all')} variant="ghost" block>
                Seguir comprando
              </ButtonLink>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
