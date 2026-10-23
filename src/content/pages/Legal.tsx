import { Alert } from '@/components/ui/Field';
import { returnWindowDays, store } from '@shared/config';
import { contentPages, paths } from '@shared/routes';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './Content.module.css';
import { ContentLayout, PageToc } from './ContentLayout';
import { PageIntro } from './PageIntro';

/**
 * TEXTOS LEGALES BASE — PENDIENTES DE REVISIÓN POR UN PROFESIONAL.
 * Los datos entre corchetes (marcados en rojo en la web) deben completarse con
 * la información real del titular antes de publicar la tienda.
 */
const Pending = ({ children }: { children: ReactNode }) => <span className="pending">[{children}]</span>;

const owner = (
  <>
    <Pending>Razón social o nombre del titular</Pending>, con NIF <Pending>NIF/CIF</Pending> y domicilio en <Pending>Dirección completa</Pending>
  </>
);

const contactLine = store.contact.email ? (
  <a href={`mailto:${store.contact.email}`}>{store.contact.email}</a>
) : (
  <Pending>Email de contacto</Pending>
);

const documents: Record<'privacidad' | 'terminos' | 'cookies' | 'aviso-legal', ReactNode> = {
  'aviso-legal': (
    <>
      <h2>Titular del sitio web</h2>
      <p>
        En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de que este sitio
        web es titularidad de {owner}. Contacto: {contactLine}. <Pending>Datos de inscripción registral, si aplica</Pending>.
      </p>
      <h2>Condiciones de uso</h2>
      <p>
        El acceso a la web atribuye la condición de usuario e implica la aceptación de estas condiciones. El usuario se compromete a hacer un uso adecuado
        de los contenidos y a no emplearlos para actividades ilícitas.
      </p>
      <h2>Propiedad intelectual e industrial</h2>
      <p>
        La marca HYPSOS, sus logotipos, el monograma, la estrella, el personaje, los diseños de producto, textos e imágenes de este sitio son propiedad de
        su titular o se usan con autorización. Queda prohibida su reproducción, distribución o transformación sin permiso expreso.
      </p>
      <h2>Responsabilidad</h2>
      <p>El titular no se hace responsable de los daños derivados de interrupciones del servicio, virus o fallos técnicos ajenos a su control.</p>
      <h2>Legislación aplicable</h2>
      <p>Estas condiciones se rigen por la legislación española.</p>
    </>
  ),
  privacidad: (
    <>
      <h2>Responsable del tratamiento</h2>
      <p>
        {owner}. Contacto para cuestiones de privacidad: {contactLine}.
      </p>
      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Pedidos:</strong> nombre, email, dirección y teléfono para gestionar la compra, el envío y la atención posventa. Base legal: ejecución
          del contrato.
        </li>
        <li>
          <strong>Newsletter:</strong> email para enviarte novedades y lanzamientos. Base legal: tu consentimiento, que puedes retirar en cualquier
          momento.
        </li>
        <li>
          <strong>Contacto:</strong> nombre, email y el contenido de tu mensaje para responderte. Base legal: tu consentimiento.
        </li>
      </ul>
      <h2>Pagos</h2>
      <p>
        Los pagos los procesa Stripe Payments Europe, Ltd. Los datos de tu tarjeta se introducen directamente en su plataforma y no los almacenamos.
      </p>
      <h2>Conservación</h2>
      <p>
        Conservamos los datos de los pedidos durante los plazos exigidos por la normativa fiscal y mercantil. Los datos de la newsletter, hasta que te des
        de baja. <Pending>Revisar plazos</Pending>
      </p>
      <h2>Destinatarios</h2>
      <p>
        Proveedores necesarios para prestar el servicio (pasarela de pago, logística, alojamiento web) que actúan como encargados del tratamiento.{' '}
        <Pending>Listar proveedores definitivos</Pending>
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {contactLine}. También puedes
        reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>
    </>
  ),
  terminos: (
    <>
      <h2>Vendedor</h2>
      <p>
        Las ventas realizadas en esta tienda las efectúa {owner}.
      </p>
      <h2>Precios e impuestos</h2>
      <p>
        Los precios se muestran en euros e incluyen el IVA aplicable. Los gastos de envío se indican antes de finalizar la compra (ver{' '}
        <Link to={paths.page('envios')}>envíos</Link>).
      </p>
      <h2>Proceso de compra</h2>
      <p>
        El contrato se perfecciona cuando se confirma el pago. Recibirás un email con el resumen del pedido. Si un producto no estuviera disponible tras el
        pago, te informaremos y reembolsaremos el importe íntegro.
      </p>
      <h2>Derecho de desistimiento</h2>
      <p>
        Dispones de {returnWindowDays()} días naturales desde la entrega para desistir de la compra sin necesidad de justificación (el mínimo legal en
        la Unión Europea son {store.legalWithdrawalDays} días). Consulta el procedimiento en <Link to={paths.page('envios')}>envíos y devoluciones</Link>.
      </p>
      <h2>Garantía</h2>
      <p>Los productos cuentan con la garantía legal de conformidad de tres años prevista en la normativa de consumo.</p>
      <h2>Resolución de conflictos</h2>
      <p>
        <Pending>Revisar: plataforma europea de resolución de litigios en línea y adhesión a sistemas de arbitraje de consumo, si aplica.</Pending>
      </p>
    </>
  ),
  cookies: (
    <>
      <h2>Qué usamos</h2>
      <p>
        Esta web <strong>no utiliza cookies de analítica, publicidad ni de terceros</strong>. Solo guarda en tu navegador (almacenamiento local) la
        información necesaria para el funcionamiento que tú solicitas:
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Finalidad</th>
            <th scope="col">Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">hypsos-cart</th>
            <td>Recordar los productos de tu carrito</td>
            <td>Hasta que lo vacíes</td>
          </tr>
          <tr>
            <th scope="row">hypsos-wishlist</th>
            <td>Recordar tus favoritos en este dispositivo</td>
            <td>Hasta que los elimines</td>
          </tr>
          <tr>
            <th scope="row">hypsos-intro-seen</th>
            <td>No repetir la animación de bienvenida en la misma sesión</td>
            <td>Sesión</td>
          </tr>
        </tbody>
      </table>
      <p>
        Al ser estrictamente necesarios para el servicio solicitado, no requieren consentimiento. Si en el futuro se incorporan herramientas de analítica
        o marketing, se pedirá tu consentimiento previo mediante un panel de configuración.
      </p>
    </>
  ),
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Añade anclas a los h2 del documento (índice lateral) y envuelve las tablas para el scroll horizontal. */
function withAnchors(document: ReactNode) {
  const toc: { id: string; label: string }[] = [];
  const fragment = document as ReactElement<{ children: ReactNode }>;
  const children = Children.map(fragment.props.children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    if (child.type === 'h2') {
      const label = String(child.props.children);
      const id = slug(label);
      toc.push({ id, label });
      return cloneElement(child as ReactElement<{ id?: string }>, { id });
    }
    if (child.type === 'table') return <div className={styles.tableWrap}>{child}</div>;
    return child;
  });
  return { toc, children };
}

export function LegalPage({ handle }: { handle: keyof typeof documents }) {
  const page = contentPages[handle];
  const { toc, children } = withAnchors(documents[handle]);
  return (
    <>
      <PageIntro title={page.title} breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: page.title }]} />
      <ContentLayout rail={<PageToc items={toc} />}>
        <Alert tone="info" title="Documento base pendiente de revisión legal" className={styles.notice}>
          <p>Los datos marcados entre corchetes deben completarse con la información real del titular antes de publicar la tienda.</p>
        </Alert>
        <div className={styles.article}>{children}</div>
      </ContentLayout>
    </>
  );
}

export type LegalHandle = keyof typeof documents;
