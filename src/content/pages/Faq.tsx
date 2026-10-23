import { Reveal } from '@/components/motion/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { freeShippingThreshold, returnWindowDays, shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './Content.module.css';
import { ContentLayout, PageToc } from './ContentLayout';
import { PageIntro } from './PageIntro';

const PENDING = 'Lo publicaremos aquí en cuanto esté confirmado con el operador logístico.';

// Las respuestas salen de la configuración de la tienda (shared/config.ts): no se promete nada que no esté confirmado.
function groups() {
  const threshold = freeShippingThreshold();
  return [
    {
      id: 'pedidos',
      title: 'Pedidos',
      items: [
        {
          id: 'confirmacion',
          title: '¿Cómo sé que mi pedido se ha realizado?',
          content: <p>Al completar el pago verás la página de confirmación con tu número de pedido. Si tienes cuenta, también aparecerá en «Mis pedidos».</p>,
        },
        {
          id: 'modificar',
          title: '¿Puedo modificar o cancelar un pedido?',
          content: (
            <p>
              Escríbenos cuanto antes desde <Link to={paths.page('contacto')}>contacto</Link> con tu número de pedido y lo revisaremos.
            </p>
          ),
        },
        {
          id: 'agotado',
          title: 'Un producto está agotado, ¿volverá?',
          content: <p>En la ficha del producto puedes pulsar «Avísame» y te escribiremos si vuelve a haber stock de tu talla.</p>,
        },
      ],
    },
    {
      id: 'envios',
      title: 'Envíos',
      items: [
        {
          id: 'plazos',
          title: '¿Cuánto tarda en llegar y cuánto cuesta?',
          content:
            shippingMethods.length > 0 ? (
              <ul>
                {shippingMethods.map((method) => (
                  <li key={method.id}>
                    {method.name}: {method.description} ({formatPrice(method.price)}).
                  </li>
                ))}
              </ul>
            ) : (
              <p>{PENDING}</p>
            ),
        },
        ...(threshold !== null
          ? [{ id: 'gratis', title: '¿Hay envío gratuito?', content: <p>Sí, en pedidos desde {formatPrice(threshold)}.</p> }]
          : []),
        {
          id: 'paises',
          title: '¿A qué países enviáis?',
          content: shippingMethods.length > 0 ? <p>{store.shippingCountries.map((country) => country.name).join(', ')}.</p> : <p>{PENDING}</p>,
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
          content: <p>{returnWindowDays()} días naturales desde la entrega. La prenda debe estar sin usar, sin lavar y con sus etiquetas.</p>,
        },
        {
          id: 'como',
          title: '¿Cómo hago una devolución?',
          content: (
            <p>
              Sigue los pasos de <Link to={paths.page('envios')}>envíos y devoluciones</Link>.
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
              Cada ficha indica el ajuste de la prenda. Consulta la <Link to={paths.page('guia-de-tallas')}>guía de tallas</Link> para comparar medidas.
            </p>
          ),
        },
      ],
    },
    {
      id: 'cuenta',
      title: 'Cuenta',
      items: [
        {
          id: 'necesito',
          title: '¿Necesito una cuenta para comprar?',
          content: (
            <p>
              No. Con <Link to={paths.account}>una cuenta</Link> guardas direcciones y favoritos en todos tus dispositivos y ves el historial de pedidos.
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
          title: '¿Cómo se paga?',
          content: (
            <p>
              El pago se hace en la página segura de Stripe. Los métodos disponibles (tarjeta, Apple Pay, Google Pay…) dependen de la configuración de la
              tienda y de tu dispositivo, y los verás antes de pagar.
            </p>
          ),
        },
      ],
    },
  ];
}

export function FaqPage() {
  const list = groups();
  return (
    <>
      <PageIntro
        title="Preguntas frecuentes"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Preguntas frecuentes' }]}
        lead="Pedidos, envíos, devoluciones, tallas y pagos."
      />
      <ContentLayout rail={<PageToc label="Temas" items={list.map((group) => ({ id: `faq-${group.id}`, label: group.title }))} />}>
        <div className={styles.faqGroups}>
          {list.map((group, index) => (
            <Reveal key={group.id} index={index}>
              <section aria-labelledby={`faq-${group.id}-title`} id={`faq-${group.id}`} className={styles.faqGroup}>
                <h2 id={`faq-${group.id}-title`} className={styles.groupTitle}>
                  <span className={styles.groupIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {group.title}
                </h2>
                <Accordion items={group.items} size="lg" />
              </section>
            </Reveal>
          ))}
        </div>
        <div className={styles.cta} data-theme="dark">
          <div>
            <p className={styles.ctaTitle}>¿No encuentras tu respuesta?</p>
            <p className={styles.ctaText}>Escríbenos con tu número de pedido, si lo tienes, y lo revisamos.</p>
          </div>
          <ButtonLink to={paths.page('contacto')}>Escríbenos</ButtonLink>
        </div>
      </ContentLayout>
    </>
  );
}
