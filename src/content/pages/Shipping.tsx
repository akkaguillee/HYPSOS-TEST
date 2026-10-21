import { PageHeader } from '@/components/layout/PageHeader';
import { returnWindowDays, shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { Link } from 'react-router';

/** Todo lo que se afirma aquí sale de shared/config.ts: si una política no está confirmada, se indica como pendiente. */
export function ShippingPage() {
  const ownReturnPolicy = store.policies.returnWindowDays !== null;
  return (
    <>
      <PageHeader
        eyebrow="Ayuda"
        title="Envíos y devoluciones"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Envíos y devoluciones' }]}
      />
      <div className="container" style={{ paddingBlock: 'var(--space-7) var(--section-y)' }}>
        <div className="prose">
          <h2>Envíos</h2>
          {shippingMethods.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Método</th>
                    <th scope="col">Plazo</th>
                    <th scope="col">Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {shippingMethods.map((method) => (
                    <tr key={method.id}>
                      <th scope="row">{method.name}</th>
                      <td>{method.description}</td>
                      <td className="t-num">
                        {formatPrice(method.price)}
                        {method.freeFrom !== undefined && ` · gratis desde ${formatPrice(method.freeFrom)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Enviamos a: {store.shippingCountries.map((country) => country.name).join(', ')}. Los plazos empiezan a contar desde la confirmación del pago.</p>
            </>
          ) : (
            <p>
              <span className="pending">Pendiente</span> Las tarifas, los plazos de entrega y los países de envío se publicarán aquí cuando el operador
              logístico esté confirmado. Hasta entonces la tienda no acepta pedidos.
            </p>
          )}

          <h2>Devoluciones y desistimiento</h2>
          <p>
            Tienes <strong>{returnWindowDays()} días naturales</strong> desde la entrega para desistir de tu compra sin necesidad de justificarlo
            {ownReturnPolicy ? '.' : ', que es el plazo mínimo que establece la ley para las compras a distancia en la Unión Europea.'}
          </p>
          <ol>
            <li>
              Escríbenos desde <Link to={paths.page('contacto')}>contacto</Link> indicando tu número de pedido y los productos que quieres devolver.
            </li>
            <li>Te indicaremos cómo enviar el paquete.</li>
            <li>Reembolsaremos el importe en el mismo método de pago en un máximo de 14 días desde que comuniques el desistimiento (plazo legal).</li>
          </ol>
          <p>
            <span className="pending">Pendiente</span> Quién asume el coste del envío de devolución, excepciones por higiene (p. ej. calcetines) y
            condiciones de los productos personalizados o numerados.
          </p>

          <h2>Cambios de talla</h2>
          <p>
            Consulta la <Link to={paths.page('guia-de-tallas')}>guía de tallas</Link> antes de comprar. Para cambiar de talla, devuelve el producto y haz un
            nuevo pedido.
          </p>
        </div>
      </div>
    </>
  );
}
