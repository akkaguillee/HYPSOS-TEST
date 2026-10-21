import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { Link } from 'react-router';

// Respuestas basadas en la configuración de la tienda (shared/config.ts). Revisar con HYPSOS.
const groups = [
  {
    id: 'pedidos',
    title: 'Pedidos',
    items: [
      {
        id: 'confirmacion',
        title: '¿Cómo sé que mi pedido se ha realizado?',
        content: <p>Al completar el pago verás la página de confirmación con tu número de pedido y recibirás un email con el resumen.</p>,
      },
      {
        id: 'modificar',
        title: '¿Puedo modificar o cancelar un pedido?',
        content: (
          <p>
            Si todavía no ha salido del almacén, sí. Escríbenos cuanto antes desde <Link to={paths.page('contacto')}>contacto</Link> indicando tu número de
            pedido.
          </p>
        ),
      },
      {
        id: 'agotado',
        title: 'Un producto está agotado, ¿volverá?',
        content: <p>Las ediciones limitadas no se reponen. Las piezas de la colección Base sí vuelven: suscríbete a la newsletter para enterarte.</p>,
      },
    ],
  },
  {
    id: 'envios',
    title: 'Envíos',
    items: [
      {
        id: 'plazos',
        title: '¿Cuánto tarda en llegar?',
        content: (
          <ul>
            {shippingMethods.map((method) => (
              <li key={method.id}>
                {method.name}: {method.description} ({formatPrice(method.price)}).
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: 'gratis',
        title: '¿Cuándo es gratis el envío?',
        content: <p>El envío estándar es gratuito en pedidos desde {formatPrice(store.freeShippingThreshold)}.</p>,
      },
      {
        id: 'paises',
        title: '¿A qué países enviáis?',
        content: <p>Actualmente enviamos a {store.shippingCountries.map((country) => country.name).join(', ')}.</p>,
      },
    ],
  },
  {
    id: 'devoluciones',
    title: 'Cambios y devoluciones',
    items: [
      {
        id: 'plazo',
        title: '¿Cuánto tiempo tengo para devolver?',
        content: <p>{store.returnWindowDays} días desde la entrega. La prenda debe estar sin usar, sin lavar y con sus etiquetas.</p>,
      },
      {
        id: 'como',
        title: '¿Cómo hago una devolución?',
        content: (
          <p>
            Sigue los pasos de <Link to={paths.page('envios')}>envíos y devoluciones</Link>. Reembolsamos en el mismo método de pago en un máximo de 14 días
            desde que recibimos el paquete.
          </p>
        ),
      },
    ],
  },
  {
    id: 'tallas',
    title: 'Tallas',
    items: [
      {
        id: 'corte',
        title: '¿Cómo tallan las prendas?',
        content: (
          <p>
            La mayoría tienen corte oversize. Si prefieres un ajuste regular, elige una talla menos. Consulta la{' '}
            <Link to={paths.page('guia-de-tallas')}>guía de tallas</Link> de cada prenda.
          </p>
        ),
      },
    ],
  },
  {
    id: 'pagos',
    title: 'Pagos',
    items: [
      {
        id: 'metodos',
        title: '¿Qué métodos de pago aceptáis?',
        content: <p>El pago se realiza en la página segura de Stripe. Los métodos disponibles (tarjeta, Apple Pay, Google Pay…) dependen de la configuración de la tienda y de tu dispositivo.</p>,
      },
      {
        id: 'seguridad',
        title: '¿Es seguro pagar?',
        content: <p>Sí. Los datos de pago se introducen directamente en la pasarela cifrada; nunca pasan por nuestros servidores.</p>,
      },
    ],
  },
];

export function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ayuda"
        title="Preguntas frecuentes"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Preguntas frecuentes' }]}
      />
      <div className="container" style={{ display: 'grid', gap: 'var(--space-8)', paddingBlock: 'var(--space-7) var(--section-y)', maxWidth: 'calc(880px + var(--gutter) * 2)' }}>
        {groups.map((group, index) => (
          <Reveal key={group.id} index={index}>
            <section aria-labelledby={`faq-${group.id}`} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <h2 id={`faq-${group.id}`} className="eyebrow">
                {group.title}
              </h2>
              <Accordion items={group.items} />
            </section>
          </Reveal>
        ))}
        <div style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'start' }}>
          <p className="t-h3">¿No encuentras tu respuesta?</p>
          <ButtonLink to={paths.page('contacto')}>Escríbenos</ButtonLink>
        </div>
      </div>
    </>
  );
}
