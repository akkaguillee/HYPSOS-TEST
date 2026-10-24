import { Mascot } from '@/components/brand/BrandVector';
import { CartLineItem } from '@/components/commerce/CartLineItem';
import { FreeShippingProgress } from '@/components/commerce/FreeShippingProgress';
import { PageIntro } from '@/content/pages/PageIntro';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { cartCount, cartSubtotal, resolveCartLines, useCart } from '@/store/cart';
import { useInventory, useStock } from '@/store/inventory';
import { freeShippingThreshold } from '@shared/config';
import { paths } from '@shared/routes';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
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
      <PageIntro
        title="Carrito"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Carrito' }]}
        aside={count > 0 ? `${count} ${count === 1 ? 'artículo' : 'artículos'}` : undefined}
      />
      <div className="container">
        {lines.length === 0 ? (
          <div className={`${cartStyles.empty} ${styles.empty}`}>
            <Mascot className={cartStyles.emptySticker} />
            <p className={cartStyles.emptyTitle}>Tu carrito está vacío</p>
            <p className={cartStyles.emptyText}>Cuando añadas productos aparecerán aquí.</p>
            <ButtonLink to={paths.collection('all')}>Ir a la tienda</ButtonLink>
          </div>
        ) : (
          <div className={styles.layout}>
            <ul role="list" className={`${cartStyles.lines} ${styles.lines}`}>
              {lines.map((line) => (
                <CartLineItem key={line.id} line={line} variant="page" />
              ))}
            </ul>
            <aside className={styles.summary} aria-labelledby="cart-summary-title">
              <h2 id="cart-summary-title" className={styles.summaryTitle}>
                Resumen
              </h2>
              {freeShippingThreshold() !== null && (
                <div className={styles.shippingBox}>
                  <FreeShippingProgress subtotal={subtotal} />
                </div>
              )}
              <dl className={styles.rows}>
                <div className={styles.row}>
                  <dt>Subtotal</dt>
                  <dd>
                    <Price amount={subtotal} />
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Envío</dt>
                  <dd className={styles.muted}>Se calcula en el checkout</dd>
                </div>
                <div className={`${styles.row} ${styles.total}`}>
                  <dt>Total estimado</dt>
                  <dd>
                    <Price amount={subtotal} />
                  </dd>
                </div>
              </dl>
              <p className={styles.note}>IVA incluido.</p>
              <Button size="lg" block disabled={blocked} onClick={() => navigate(paths.checkout, { viewTransition: true })}>
                Finalizar compra
              </Button>
              {blocked && <p className={styles.blocked}>Elimina los productos agotados para continuar.</p>}
              <Link to={paths.collection('all')} className={cartStyles.secondaryLink} viewTransition>
                Seguir comprando
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
