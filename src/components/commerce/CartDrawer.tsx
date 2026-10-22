import { Mascot } from '@/components/brand/BrandVector';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Price } from '@/components/ui/Price';
import { cartCount, cartSubtotal, resolveCartLines, useCart } from '@/store/cart';
import { useInventory, useStock } from '@/store/inventory';
import { paths } from '@shared/routes';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import styles from './Cart.module.css';
import { CartLineItem } from './CartLineItem';
import { FreeShippingProgress } from './FreeShippingProgress';

export function CartDrawer() {
  const isOpen = useCart((state) => state.isOpen);
  const close = useCart((state) => state.close);
  const rawLines = useCart((state) => state.lines);
  const { lookup } = useStock();
  const loadInventory = useInventory((state) => state.load);
  const lines = useMemo(() => resolveCartLines(rawLines, lookup), [rawLines, lookup]);
  // Al abrir el carrito se refresca el stock para detectar variantes agotadas.
  useEffect(() => {
    if (isOpen) void loadInventory();
  }, [isOpen, loadInventory]);
  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);
  const navigate = useNavigate();
  const blocked = lines.some((line) => line.maxQuantity === 0);

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={`Carrito${count ? ` (${count})` : ''}`}
      footer={
        lines.length > 0 && (
          <div className={styles.summary}>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Subtotal</span>
              <Price amount={subtotal} />
            </div>
            <p className={styles.summaryNote}>IVA incluido. Los gastos de envío se calculan en el checkout.</p>
            <div className={styles.actions}>
              <Button
                size="lg"
                block
                disabled={blocked}
                onClick={() => {
                  close();
                  navigate(paths.checkout, { viewTransition: true });
                }}
              >
                Finalizar compra
              </Button>
              <ButtonLink to={paths.cart} variant="outline" block onClick={close}>
                Ver carrito
              </ButtonLink>
            </div>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className={styles.empty}>
          <Mascot className={styles.emptyMascot} />
          <p className={styles.emptyTitle}>Tu carrito está vacío</p>
          <p className="t-small t-muted">Los drops vuelan. Echa un vistazo a lo último antes de que se agote.</p>
          <ButtonLink to={paths.collection('novedades')} onClick={close}>
            Ver novedades
          </ButtonLink>
        </div>
      ) : (
        <>
          <FreeShippingProgress subtotal={subtotal} />
          <ul role="list" className={styles.lines}>
            {lines.map((line) => (
              <CartLineItem key={line.id} line={line} onNavigate={close} />
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}
