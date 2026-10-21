import { PageHeader } from '@/components/layout/PageHeader';
import { shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { Link } from 'react-router';

export function ShippingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ayuda"
        title="Envíos y devoluciones"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Envíos y devoluciones' }]}
      />
      <div className="container" style={{ paddingBlock: 'var(--space-7) var(--section-y)' }}>
        <div className="prose">
          <p>
            <strong>Condiciones provisionales:</strong> plazos y costes definidos en la configuración de la tienda, pendientes de confirmar con el operador
            logístico.
          </p>
          <h2>Métodos de envío</h2>
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
                    {method.id === 'standard' && ` · gratis desde ${formatPrice(store.freeShippingThreshold)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Enviamos a: {store.shippingCountries.map((country) => country.name).join(', ')}. Los plazos empiezan a contar desde la confirmación del pago.</p>

          <h2>Devoluciones</h2>
          <p>
            Tienes <strong>{store.returnWindowDays} días naturales</strong> desde la entrega para devolver cualquier producto sin usar, sin lavar y con sus
            etiquetas originales.
          </p>
          <ol>
            <li>
              Escríbenos desde <Link to={paths.page('contacto')}>contacto</Link> indicando tu número de pedido y los productos que quieres devolver.
            </li>
            <li>Te enviaremos las instrucciones y la etiqueta de devolución.</li>
            <li>Cuando recibamos y revisemos el paquete, reembolsaremos el importe en el mismo método de pago en un máximo de 14 días.</li>
          </ol>
          <h3>Excepciones</h3>
          <p>
            Por higiene, los calcetines solo se aceptan con el embalaje sin abrir. Las piezas 3D numeradas y los stickers pueden devolverse si no se han
            usado ni aplicado.
          </p>

          <h2>Cambios de talla</h2>
          <p>
            La forma más rápida es devolver la prenda y hacer un nuevo pedido con la talla correcta, sobre todo en ediciones limitadas con stock reducido.
            Consulta la <Link to={paths.page('guia-de-tallas')}>guía de tallas</Link> antes de comprar.
          </p>
        </div>
      </div>
    </>
  );
}
