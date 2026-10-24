import { returnWindowDays, shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './Content.module.css';
import { ContentLayout, PageToc } from './ContentLayout';
import { PageIntro } from './PageIntro';

/** Todo lo que se afirma aquí sale de shared/config.ts: si una política no está confirmada, se indica como pendiente. */
export function ShippingPage() {
  const ownReturnPolicy = store.policies.returnWindowDays !== null;
  return (
    <>
      <PageIntro title="Envíos y devoluciones" breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Envíos y devoluciones' }]} />
      <ContentLayout
        rail={
          <PageToc
            items={[
              { id: 'envios', label: 'Envíos' },
              { id: 'devoluciones', label: 'Devoluciones y desistimiento' },
              { id: 'cambios', label: 'Cambios de talla' },
            ]}
          />
        }
      >
        <div className={styles.article}>
          <h2 id="envios">Envíos</h2>
          {shippingMethods.length > 0 ? (
            <>
              <div className={styles.tableWrap}>
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
                        {method.freeFrom !== undefined && ` / gratis desde ${formatPrice(method.freeFrom)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <p>Enviamos a: {store.shippingCountries.map((country) => country.name).join(', ')}. Los plazos empiezan a contar desde la confirmación del pago.</p>
            </>
          ) : (
            <p>
              <span className="pending">Pendiente</span> Las tarifas, los plazos de entrega y los países de envío se publicarán aquí cuando el operador
              logístico esté confirmado. Hasta entonces la tienda no acepta pedidos.
            </p>
          )}

          <h2 id="devoluciones">Devoluciones y desistimiento</h2>
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

          <h2 id="cambios">Cambios de talla</h2>
          <p>
            Consulta la <Link to={paths.page('guia-de-tallas')}>guía de tallas</Link> antes de comprar. Para cambiar de talla, devuelve el producto y haz un
            nuevo pedido.
          </p>
        </div>
      </ContentLayout>
    </>
  );
}
