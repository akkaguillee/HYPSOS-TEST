import { Mascot } from '@/components/brand/BrandVector';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Field';
import { apiRequest } from '@/lib/api';
import { useCart } from '@/store/cart';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

interface OrderStatus {
  orderNumber: string;
  status: 'pending_payment' | 'paid' | 'expired' | 'cancelled';
  email: string;
  total: number;
  itemCount: number;
}

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'order'; order: OrderStatus };

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState<State>(sessionId ? { kind: 'loading' } : { kind: 'missing' });
  const clearCart = useCart((s) => s.clear);

  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    let timer: number | undefined;
    const controller = new AbortController();
    // El webhook puede tardar unos segundos en confirmar el pago: se consulta varias veces.
    const poll = async () => {
      try {
        const order = await apiRequest<OrderStatus>(`/checkout/session/${encodeURIComponent(sessionId)}`, { signal: controller.signal });
        setState({ kind: 'order', order });
        if (order.status === 'paid') clearCart();
        else if (order.status === 'pending_payment' && attempts++ < 6) timer = window.setTimeout(poll, 2500);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ kind: 'error' });
      }
    };
    poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [sessionId, clearCart]);

  return (
    <>
      <PageHeader title="Gracias" eyebrow="Pedido" breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Pedido' }]} />
      <div className="container" style={{ display: 'grid', gap: 'var(--space-6)', paddingBlock: 'var(--space-7) var(--section-y)', maxWidth: 760 }}>
        <Mascot style={{ width: 140, height: 'auto', color: 'var(--c-white)' }} />
        {state.kind === 'loading' && <p className="t-lead">Comprobando tu pedido…</p>}
        {state.kind === 'missing' && (
          <Alert tone="info" title="No encontramos la referencia del pago">
            <p>Si has completado un pago, recibirás la confirmación por email. Si tienes dudas, escríbenos.</p>
          </Alert>
        )}
        {state.kind === 'error' && (
          <Alert title="No hemos podido consultar el pedido">
            <p>Si el pago se completó, recibirás un email de confirmación. Si no llega, contacta con nosotros.</p>
          </Alert>
        )}
        {state.kind === 'order' && state.order.status === 'paid' && (
          <Alert tone="success" title={`Pedido ${state.order.orderNumber} confirmado`}>
            <p>
              {state.order.itemCount} {state.order.itemCount === 1 ? 'artículo' : 'artículos'} · {formatPrice(state.order.total)}. Enviaremos la
              confirmación a {state.order.email}.
            </p>
          </Alert>
        )}
        {state.kind === 'order' && state.order.status === 'pending_payment' && (
          <Alert tone="info" title={`Pedido ${state.order.orderNumber} pendiente de confirmación`}>
            <p>Estamos esperando la confirmación del pago. Esta página se actualizará sola.</p>
          </Alert>
        )}
        {state.kind === 'order' && (state.order.status === 'expired' || state.order.status === 'cancelled') && (
          <Alert title="El pago no se ha completado">
            <p>No se ha realizado ningún cargo. Puedes volver a intentarlo desde el carrito.</p>
          </Alert>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <ButtonLink to={paths.collection('novedades')}>Seguir comprando</ButtonLink>
          <ButtonLink to={paths.page('contacto')} variant="outline">
            Contacto
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
