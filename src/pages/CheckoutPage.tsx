import { ProductMedia } from '@/components/commerce/ProductMedia';
import { mediaForColor } from '@/lib/product-media';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Price } from '@/components/ui/Price';
import { ApiError, apiRequest } from '@/lib/api';
import { cartSubtotal, resolveCartLines, useCart } from '@/store/cart';
import { shippingMethods, store } from '@shared/config';
import { calculateTotals, formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import { checkoutRequestSchema, fieldErrors } from '@shared/schemas';
import type { ShippingMethodId } from '@shared/types';
import { Lock } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
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

export default function CheckoutPage() {
  const rawLines = useCart((state) => state.lines);
  const lines = useMemo(() => resolveCartLines(rawLines), [rawLines]);
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [address, setAddress] = useState(emptyAddress);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>('standard');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(
    params.get('cancelled') ? { tone: 'info', title: 'Pago cancelado', message: 'No se ha realizado ningún cargo. Tu carrito sigue aquí.' } : null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const subtotal = cartSubtotal(lines);
  const totals = calculateTotals(lines, shippingMethod);

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
      email,
      marketingOptIn,
      shippingAddress: address,
      shippingMethod,
      acceptTerms,
      lines: lines.map(({ productId, colorId, size, quantity }) => ({ productId, colorId, size, quantity })),
    };
    const parsed = checkoutRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      focusFirstError();
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
      if (error.code === 'payments_not_configured') {
        setFeedback({
          tone: 'info',
          title: 'Pagos online aún no disponibles',
          message: 'La pasarela de pago de la tienda todavía no está activada, así que no se ha creado ningún pedido ni se ha realizado ningún cargo. Tu carrito se conserva.',
        });
        return;
      }
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
      />
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
            <div className={styles.methods}>
              {shippingMethods.map((method) => {
                const cost = calculateTotals(lines, method.id).shipping;
                return (
                  <label key={method.id} className={styles.method}>
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method.id}
                      checked={shippingMethod === method.id}
                      onChange={() => setShippingMethod(method.id)}
                    />
                    <span className={styles.methodName}>
                      {method.name}
                      <span>{method.description}</span>
                    </span>
                    <strong className="t-num">{cost === 0 ? 'Gratis' : formatPrice(cost)}</strong>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNumber}>4</span> Pago
            </legend>
            <div className={styles.payment}>
              <p className={styles.paymentHead}>
                <Lock aria-hidden="true" /> Pago seguro con Stripe
              </p>
              <p>
                Al continuar irás a la página de pago cifrada de nuestra pasarela. Los datos de tu tarjeta nunca pasan por nuestros servidores.
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
            <span className="t-num">{totals.shipping === 0 ? 'Gratis' : formatPrice(totals.shipping)}</span>
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
