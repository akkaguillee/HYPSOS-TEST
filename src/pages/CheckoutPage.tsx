import { ProductMedia } from '@/components/commerce/ProductMedia';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Price } from '@/components/ui/Price';
import { track } from '@/lib/analytics';
import { ApiError, apiRequest } from '@/lib/api';
import { mediaForColor } from '@/lib/product-media';
import { useAuth } from '@/store/auth';
import { cartSubtotal, resolveCartLines, useCart } from '@/store/cart';
import { useInventory, useStock } from '@/store/inventory';
import { useStoreStatus } from '@/store/storeStatus';
import { shippingMethods, store } from '@shared/config';
import { calculateTotals, formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { checkoutRequestSchema, fieldErrors, type Address } from '@shared/schemas';
import { Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import styles from './CheckoutPage.module.css';

const emptyAddress = {
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  postalCode: '',
  city: '',
  province: '',
  country: 'ES',
  phone: '',
};

type Feedback = { tone: 'error' | 'info'; title: string; message: string } | null;

/** Identificador del intento de pago: el mismo para el mismo carrito, nuevo si el carrito cambia. */
function useCheckoutId(signature: string) {
  const [state, setState] = useState(() => ({ signature, id: crypto.randomUUID() }));
  let current = state;
  if (state.signature !== signature) {
    current = { signature, id: crypto.randomUUID() };
    setState(current);
  }
  return { id: current.id, renew: () => setState({ signature, id: crypto.randomUUID() }) };
}

export default function CheckoutPage() {
  const rawLines = useCart((state) => state.lines);
  const { lookup } = useStock();
  const loadInventory = useInventory((state) => state.load);
  const lines = useMemo(() => resolveCartLines(rawLines, lookup), [rawLines, lookup]);
  const status = useStoreStatus();
  const user = useAuth((state) => state.user);
  const [params] = useSearchParams();
  const [email, setEmail] = useState(user?.email ?? '');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [address, setAddress] = useState(emptyAddress);
  const [shippingMethod, setShippingMethod] = useState<string>(shippingMethods[0]?.id ?? '');
  const signature = rawLines.map((line) => `${line.id}x${line.quantity}`).join('|');
  const checkout = useCheckoutId(signature);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(
    params.get('cancelled') ? { tone: 'info', title: 'Pago cancelado', message: 'No se ha realizado ningún cargo. Tu carrito sigue aquí.' } : null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const subtotal = cartSubtotal(lines);
  const method = shippingMethods.find((candidate) => candidate.id === shippingMethod) ?? null;
  const totals = calculateTotals(lines, method);
  const notReady = status.loaded && (!status.payments || !status.shipping);

  useEffect(() => {
    void loadInventory(true);
    void status.load();
    if (rawLines.length) track('begin_checkout', { value: subtotal / 100, items: rawLines.length });
    // Solo al entrar en el checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Con sesión iniciada se rellenan email y la dirección predeterminada.
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null);
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    if (!email) setEmail(user.email);
  }
  useEffect(() => {
    if (!user) return;
    apiRequest<{ addresses: (Address & { id: number })[] }>('/account/addresses')
      .then(({ addresses }) => {
        const preferred = addresses.find((item) => item.isDefault) ?? addresses[0];
        if (!preferred) return;
        setAddress((current) =>
          current.address1
            ? current
            : {
                firstName: preferred.firstName,
                lastName: preferred.lastName,
                address1: preferred.address1,
                address2: preferred.address2 ?? '',
                postalCode: preferred.postalCode,
                city: preferred.city,
                province: preferred.province,
                country: preferred.country,
                phone: preferred.phone,
              },
        );
      })
      .catch(() => undefined);
  }, [user]);

  const field = (name: keyof typeof emptyAddress) => ({
    name,
    value: address[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddress((current) => ({ ...current, [name]: event.target.value })),
    error: errors[`shippingAddress.${name}`],
  });

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const payload = {
      checkoutId: checkout.id,
      email,
      marketingOptIn,
      shippingAddress: address,
      shippingMethod,
      acceptTerms,
      lines: lines.map(({ productId, colorId, size, quantity }) => ({ productId, colorId, size, quantity })),
    };
    const parsed = checkoutRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const found = fieldErrors(parsed.error);
      // Sin tarifas publicadas no hay método que elegir: no es un error del cliente.
      if (shippingMethods.length === 0) delete found.shippingMethod;
      if (Object.keys(found).length > 0) {
        setErrors(found);
        focusFirstError();
        return;
      }
    }
    if (shippingMethods.length === 0 || !parsed.success) {
      setErrors({});
      setFeedback({
        tone: 'info',
        title: 'Envíos aún no configurados',
        message: 'Las tarifas de envío están pendientes de publicar. No se ha creado ningún pedido ni se ha realizado ningún cargo. Tu carrito se conserva.',
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { url } = await apiRequest<{ url: string }>('/checkout/session', { method: 'POST', body: parsed.data });
      // Redirección a la página de pago segura de la pasarela.
      window.location.assign(url);
    } catch (error) {
      setSubmitting(false);
      if (!(error instanceof ApiError)) {
        setFeedback({ tone: 'error', title: 'Error inesperado', message: 'Inténtalo de nuevo en unos segundos.' });
        return;
      }
      if (error.code === 'payments_not_configured' || error.code === 'shipping_not_configured') {
        setFeedback({
          tone: 'info',
          title: error.code === 'payments_not_configured' ? 'Pagos online aún no disponibles' : 'Envíos aún no configurados',
          message: `${error.message} No se ha creado ningún pedido ni se ha realizado ningún cargo. Tu carrito se conserva.`,
        });
        return;
      }
      if (error.code === 'checkout_id_used') checkout.renew();
      if (['out_of_stock', 'quantity_exceeded', 'invalid_variant'].includes(error.code)) void loadInventory(true);
      if (Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
        focusFirstError();
      }
      setFeedback({ tone: 'error', title: 'No hemos podido continuar', message: error.message });
    }
  };

  if (lines.length === 0) {
    return (
      <>
        <PageHeader title="Finalizar compra" breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Checkout' }]} />
        <div className="container" style={{ paddingBlock: 'var(--space-8) var(--section-y)', display: 'grid', gap: 'var(--space-4)', justifyItems: 'start' }}>
          <p className="t-h3">Tu carrito está vacío</p>
          <ButtonLink to={paths.collection('all')}>Ir a la tienda</ButtonLink>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Finalizar compra"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Carrito', to: paths.cart }, { label: 'Checkout' }]}
      >
        {notReady && (
          <Alert tone="info" title="La tienda todavía no acepta pedidos">
            <p>
              {!status.payments && 'La pasarela de pago aún no está activada. '}
              {!status.shipping && 'Las tarifas de envío están pendientes de configurar. '}
              Puedes revisar tu pedido, pero no se realizará ningún cargo.
            </p>
          </Alert>
        )}
        {!user && (
          <p className="t-small t-muted">
            ¿Tienes cuenta? <Link to={`${paths.account}?next=${encodeURIComponent(paths.checkout)}`} className="link">Inicia sesión</Link> para usar tus direcciones guardadas.
          </p>
        )}
      </PageHeader>
      <div className={`container ${styles.layout}`}>
        <form ref={formRef} className={styles.form} onSubmit={submit} noValidate aria-describedby="checkout-feedback">
          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNumber}>1</span> Contacto
            </legend>
            <div className={styles.fields}>
              <TextField
                className={styles.full}
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
                hint="Te enviaremos la confirmación y el seguimiento del pedido."
              />
              <Checkbox className={styles.full} checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)}>
                Quiero recibir avisos de nuevos drops y ediciones limitadas.
              </Checkbox>
            </div>
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNumber}>2</span> Dirección de envío
            </legend>
            <div className={styles.fields}>
              <TextField label="Nombre" autoComplete="given-name" {...field('firstName')} />
              <TextField label="Apellidos" autoComplete="family-name" {...field('lastName')} />
              <TextField className={styles.full} label="Dirección" autoComplete="address-line1" {...field('address1')} />
              <TextField className={styles.full} label="Piso, puerta, escalera" optional autoComplete="address-line2" {...field('address2')} />
              <TextField label="Código postal" autoComplete="postal-code" inputMode="numeric" {...field('postalCode')} />
              <TextField label="Ciudad" autoComplete="address-level2" {...field('city')} />
              <TextField label="Provincia" autoComplete="address-level1" {...field('province')} />
              <SelectField
                label="País"
                autoComplete="country"
                options={store.shippingCountries.map((country) => ({ value: country.code, label: country.name }))}
                {...field('country')}
              />
              <TextField className={styles.full} label="Teléfono" type="tel" autoComplete="tel" hint="Solo para incidencias con la entrega." {...field('phone')} />
            </div>
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNumber}>3</span> Método de envío
            </legend>
            {shippingMethods.length === 0 ? (
              <Alert tone="info" title="Envíos pendientes de configurar">
                <p>Las tarifas y los plazos de envío se publicarán cuando la tienda abra los pedidos.</p>
              </Alert>
            ) : (
              <div className={styles.methods}>
                {shippingMethods.map((option) => {
                  const cost = calculateTotals(lines, option).shipping;
                  return (
                    <label key={option.id} className={styles.method}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={option.id}
                        checked={shippingMethod === option.id}
                        onChange={() => setShippingMethod(option.id)}
                      />
                      <span className={styles.methodName}>
                        {option.name}
                        <span>{option.description}</span>
                      </span>
                      <strong className="t-num">{cost === 0 ? 'Gratis' : formatPrice(cost)}</strong>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNumber}>4</span> Pago
            </legend>
            <div className={styles.payment}>
              <p className={styles.paymentHead}>
                <Lock aria-hidden="true" /> Pago con Stripe Checkout
              </p>
              <p>
                Al continuar irás a la página de pago de Stripe. Los datos de tu tarjeta se introducen allí y nunca pasan por nuestros servidores.
              </p>
            </div>
            <div className={styles.submit}>
              <Checkbox checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} error={errors.acceptTerms}>
                He leído y acepto las <Link to={paths.page('terminos')}>condiciones de compra</Link> y la{' '}
                <Link to={paths.page('privacidad')}>política de privacidad</Link>.
              </Checkbox>
              <div id="checkout-feedback" aria-live="polite">
                {feedback && (
                  <Alert tone={feedback.tone} title={feedback.title}>
                    <p>{feedback.message}</p>
                  </Alert>
                )}
                {errors.lines && <Alert>{errors.lines}</Alert>}
              </div>
              <Button type="submit" size="lg" block sheen loading={submitting}>
                Pagar {formatPrice(totals.total)}
              </Button>
            </div>
          </fieldset>
        </form>

        <aside className={styles.summary} aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title" className={styles.stepTitle} style={{ marginBottom: 0 }}>
            Tu pedido
          </h2>
          <ul role="list" className={styles.summaryLines}>
            {lines.map((line) => (
              <li key={line.id} className={styles.summaryLine}>
                <span className={styles.summaryThumb}>
                  <ProductMedia product={line.product} media={mediaForColor(line.product, line.colorId)[0]} colorId={line.colorId} compact decorative sizes="56px" />
                  <span className={styles.qty} aria-label={`${line.quantity} unidades`}>
                    {line.quantity}
                  </span>
                </span>
                <span className={styles.summaryName}>
                  {line.product.name}
                  <span>
                    {line.colorName} · {line.size}
                  </span>
                </span>
                <Price amount={line.lineTotal} />
              </li>
            ))}
          </ul>
          <div className={styles.row}>
            <span>Subtotal</span>
            <Price amount={subtotal} />
          </div>
          <div className={styles.row}>
            <span>Envío</span>
            <span className="t-num">{!method ? 'Pendiente' : totals.shipping === 0 ? 'Gratis' : formatPrice(totals.shipping)}</span>
          </div>
          <div className={`${styles.row} ${styles.total}`}>
            <span>Total</span>
            <Price amount={totals.total} />
          </div>
          <p className={styles.note}>Incluye {formatPrice(totals.taxIncluded)} de IVA.</p>
        </aside>
      </div>
    </>
  );
}
