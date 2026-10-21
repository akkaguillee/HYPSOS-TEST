import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Price } from '@/components/ui/Price';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useStoreStatus } from '@/store/storeStatus';
import { useWishlist } from '@/store/wishlist';
import { store } from '@shared/config';
import { paths } from '@shared/routes';
import { addressSchema, changePasswordSchema, fieldErrors, forgotPasswordSchema, profileSchema, resetPasswordSchema, type Address } from '@shared/schemas';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import styles from './Account.module.css';
import { AuthForms } from './AuthForms';

interface OrderSummary {
  number: string;
  status: 'pending_payment' | 'paid' | 'expired' | 'cancelled' | 'shipped';
  createdAt: string;
  total: number;
  items: { productId: string; name: string; colorName: string; size: string; quantity: number; unitPrice: number }[];
}

type StoredAddress = Address & { id: number };

const STATUS_LABEL: Record<OrderSummary['status'], string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  shipped: 'Enviado',
  expired: 'Pago no completado',
  cancelled: 'Cancelado',
};

const sections = [
  { to: paths.account, label: 'Resumen', end: true },
  { to: paths.accountOrders, label: 'Pedidos' },
  { to: paths.accountAddresses, label: 'Direcciones' },
  { to: paths.accountProfile, label: 'Perfil y seguridad' },
];

export default function AccountPage() {
  const { pathname } = useLocation();
  const status = useAuth((state) => state.status);
  const user = useAuth((state) => state.user);
  const server = useStoreStatus();

  if (pathname === paths.accountRecover) return <RecoverPage />;
  if (pathname === paths.accountReset) return <ResetPage />;

  if (status === 'unknown') {
    return (
      <>
        <PageHeader title="Mi cuenta" breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Mi cuenta' }]} />
        <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
          <p className="t-muted" role="status">
            Cargando tu cuenta…
          </p>
        </div>
      </>
    );
  }

  if (!user) {
    if (pathname !== paths.account) return <Navigate to={`${paths.account}?next=${encodeURIComponent(pathname)}`} replace />;
    return (
      <>
        <PageHeader eyebrow="Cuenta" title="Accede a HYPSOS" breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Mi cuenta' }]}>
          {server.loaded && !server.online && (
            <Alert tone="info" title="Cuentas no disponibles en esta versión">
              <p>Registrarse e iniciar sesión necesita el servidor de la tienda, que no está activo aquí. Tus favoritos se guardan igualmente en este dispositivo.</p>
            </Alert>
          )}
        </PageHeader>
        <div className="container">
          <AuthForms />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Cuenta"
        title={`Hola, ${user.name.split(' ')[0]}`}
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Mi cuenta' }]}
        aside={user.email}
      />
      <div className={`container ${styles.layout}`}>
        <nav className={styles.nav} aria-label="Secciones de la cuenta">
          {sections.map((section) => (
            <NavLink key={section.to} to={section.to} end={section.end} className={styles.navLink}>
              {section.label}
            </NavLink>
          ))}
          <LogoutButton />
        </nav>
        <div className={styles.panel}>
          {pathname === paths.accountOrders && <OrdersSection />}
          {pathname === paths.accountAddresses && <AddressesSection />}
          {pathname === paths.accountProfile && <ProfileSection />}
          {pathname === paths.account && <OverviewSection />}
        </div>
      </div>
    </>
  );
}

function LogoutButton() {
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={styles.navLink}
      onClick={async () => {
        await logout();
        navigate(paths.home, { viewTransition: true });
      }}
    >
      Cerrar sesión
    </button>
  );
}

function useOrders() {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; orders: OrderSummary[] }>({ status: 'loading', orders: [] });
  useEffect(() => {
    let active = true;
    apiRequest<{ orders: OrderSummary[] }>('/account/orders')
      .then(({ orders }) => active && setState({ status: 'ready', orders }))
      .catch(() => active && setState({ status: 'error', orders: [] }));
    return () => {
      active = false;
    };
  }, []);
  return state;
}

function OverviewSection() {
  const orders = useOrders();
  const favorites = useWishlist((state) => state.productIds.length);
  return (
    <>
      <h2 className={styles.sectionTitle}>Resumen</h2>
      <div className={styles.cards}>
        <Link to={paths.accountOrders} className={styles.card}>
          <span className="t-label">Pedidos</span>
          <span className={styles.cardValue}>{orders.status === 'ready' ? orders.orders.length : '—'}</span>
        </Link>
        <Link to={paths.wishlist} className={styles.card}>
          <span className="t-label">Favoritos</span>
          <span className={styles.cardValue}>{favorites}</span>
        </Link>
        <Link to={paths.accountAddresses} className={styles.card}>
          <span className="t-label">Direcciones</span>
          <span className="t-small t-muted">Guarda dónde quieres recibir tus pedidos.</span>
        </Link>
      </div>
      {orders.status === 'ready' && orders.orders[0] && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>
            Último pedido
          </p>
          <OrderCard order={orders.orders[0]} />
        </div>
      )}
    </>
  );
}

function OrderCard({ order }: { order: OrderSummary }) {
  return (
    <article className={styles.order} aria-label={`Pedido ${order.number}`}>
      <div className={styles.orderHead}>
        <strong>{order.number}</strong>
        <span className={styles.status} data-status={order.status}>
          {STATUS_LABEL[order.status]}
        </span>
        <span className="t-muted">{new Date(order.createdAt).toLocaleDateString(store.locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <Price amount={order.total} />
      </div>
      <ul role="list" className={styles.orderItems}>
        {order.items.map((item) => (
          <li key={`${item.productId}-${item.colorName}-${item.size}`}>
            {item.quantity} × {item.name} · {item.colorName} · {item.size}
          </li>
        ))}
      </ul>
    </article>
  );
}

function OrdersSection() {
  const { status, orders } = useOrders();
  return (
    <>
      <h2 className={styles.sectionTitle}>Pedidos</h2>
      {status === 'loading' && <p className="t-muted">Cargando pedidos…</p>}
      {status === 'error' && <Alert>No hemos podido cargar tus pedidos. Recarga la página.</Alert>}
      {status === 'ready' && orders.length === 0 && (
        <div className={styles.empty}>
          <p>Aún no has hecho ningún pedido con esta cuenta.</p>
          <ButtonLink to={paths.collection('novedades')}>Ver novedades</ButtonLink>
        </div>
      )}
      <div className={styles.orders}>
        {orders.map((order) => (
          <OrderCard key={order.number} order={order} />
        ))}
      </div>
    </>
  );
}

const emptyAddress = {
  label: '',
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  postalCode: '',
  city: '',
  province: '',
  country: 'ES',
  phone: '',
  isDefault: false,
};

function AddressesSection() {
  const [addresses, setAddresses] = useState<StoredAddress[] | null>(null);
  const [editing, setEditing] = useState<StoredAddress | 'new' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const reload = () =>
    apiRequest<{ addresses: StoredAddress[] }>('/account/addresses')
      .then(({ addresses: list }) => setAddresses(list))
      .catch(() => setFailure('No hemos podido cargar tus direcciones.'));

  useEffect(() => {
    void reload();
  }, []);

  const remove = async (id: number) => {
    try {
      await apiRequest(`/account/addresses/${id}`, { method: 'DELETE' });
      await reload();
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'No se ha podido eliminar.');
    }
  };

  return (
    <>
      <h2 className={styles.sectionTitle}>Direcciones</h2>
      {failure && <Alert>{failure}</Alert>}
      {editing ? (
        <AddressForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      ) : (
        <>
          {addresses === null && !failure && <p className="t-muted">Cargando direcciones…</p>}
          {addresses?.length === 0 && (
            <div className={styles.empty}>
              <p>No tienes direcciones guardadas.</p>
            </div>
          )}
          <div className={styles.addresses}>
            {addresses?.map((address) => (
              <article key={address.id} className={styles.address} aria-label={address.label || `${address.firstName} ${address.lastName}`}>
                <p className="t-label">
                  {address.label || 'Dirección'}
                  {address.isDefault && ' · Predeterminada'}
                </p>
                <p>
                  {address.firstName} {address.lastName}
                  <br />
                  {address.address1}
                  {address.address2 && `, ${address.address2}`}
                  <br />
                  {address.postalCode} {address.city}, {address.province}
                  <br />
                  {address.phone}
                </p>
                <div className={styles.addressActions}>
                  <button type="button" className={styles.textButton} onClick={() => setEditing(address)}>
                    Editar
                  </button>
                  <button type="button" className={styles.textButton} onClick={() => remove(address.id)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div>
            <Button variant="outline" onClick={() => setEditing('new')}>
              Añadir dirección
            </Button>
          </div>
        </>
      )}
    </>
  );
}

function AddressForm({ initial, onCancel, onSaved }: { initial: StoredAddress | null; onCancel: () => void; onSaved: () => void }) {
  const [values, setValues] = useState(() => (initial ? { ...emptyAddress, ...initial, address2: initial.address2 ?? '', label: initial.label ?? '' } : emptyAddress));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const field = (name: Exclude<keyof typeof emptyAddress, 'isDefault'>) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [name]: event.target.value })),
    error: errors[name],
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await apiRequest(initial ? `/account/addresses/${initial.id}` : '/account/addresses', { method: initial ? 'PUT' : 'POST', body: parsed.data });
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      setFailure(error instanceof ApiError ? error.message : 'No se ha podido guardar.');
      setSending(false);
    }
  };

  return (
    <form ref={form} className={styles.form} onSubmit={submit} noValidate aria-label={initial ? 'Editar dirección' : 'Nueva dirección'}>
      <div className={styles.fields}>
        <TextField className={styles.full} label="Nombre de la dirección" optional placeholder="Casa, trabajo…" {...field('label')} />
        <TextField label="Nombre" autoComplete="given-name" {...field('firstName')} />
        <TextField label="Apellidos" autoComplete="family-name" {...field('lastName')} />
        <TextField className={styles.full} label="Dirección" autoComplete="address-line1" {...field('address1')} />
        <TextField className={styles.full} label="Piso, puerta, escalera" optional autoComplete="address-line2" {...field('address2')} />
        <TextField label="Código postal" autoComplete="postal-code" inputMode="numeric" {...field('postalCode')} />
        <TextField label="Ciudad" autoComplete="address-level2" {...field('city')} />
        <TextField label="Provincia" autoComplete="address-level1" {...field('province')} />
        <SelectField label="País" options={store.shippingCountries.map((country) => ({ value: country.code, label: country.name }))} {...field('country')} />
        <TextField className={styles.full} label="Teléfono" type="tel" autoComplete="tel" {...field('phone')} />
      </div>
      <Checkbox checked={values.isDefault} onChange={(event) => setValues({ ...values, isDefault: event.target.checked })}>
        Usar como dirección predeterminada
      </Checkbox>
      {failure && <Alert>{failure}</Alert>}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button type="submit" loading={sending}>
          Guardar dirección
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ProfileSection() {
  const user = useAuth((state) => state.user)!;
  const setUser = useAuth((state) => state.setUser);
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user.name, marketingOptIn: user.marketingOptIn });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const run = async (action: () => Promise<void>, success: string) => {
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'success', text: success });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      setNotice({ tone: 'error', text: error instanceof ApiError ? error.message : 'Ha ocurrido un error.' });
    }
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void run(async () => {
      const { user: updated } = await apiRequest<{ user: typeof user }>('/account/profile', { method: 'PATCH', body: parsed.data });
      setUser(updated);
    }, 'Perfil actualizado.');
  };

  const changePassword = (event: FormEvent) => {
    event.preventDefault();
    const parsed = changePasswordSchema.safeParse(passwords);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void run(async () => {
      await apiRequest('/account/password', { method: 'POST', body: parsed.data });
      setPasswords({ currentPassword: '', newPassword: '' });
    }, 'Contraseña cambiada. Se han cerrado tus otras sesiones.');
  };

  const deleteAccount = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await apiRequest('/account', { method: 'DELETE', body: { password: deletePassword } });
      await logout();
      navigate(paths.home, { replace: true });
    }, 'Cuenta eliminada.');
  };

  return (
    <>
      <h2 className={styles.sectionTitle}>Perfil y seguridad</h2>
      {notice && <Alert tone={notice.tone === 'success' ? 'success' : 'error'}>{notice.text}</Alert>}

      <form className={styles.form} onSubmit={saveProfile} noValidate aria-label="Datos del perfil">
        <TextField label="Nombre" autoComplete="name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} error={errors.name} />
        <TextField label="Email" value={user.email} readOnly hint="Para cambiar el email, escríbenos desde contacto." />
        <Checkbox checked={profile.marketingOptIn} onChange={(event) => setProfile({ ...profile, marketingOptIn: event.target.checked })}>
          Quiero recibir novedades de HYPSOS por email.
        </Checkbox>
        <div>
          <Button type="submit">Guardar perfil</Button>
        </div>
      </form>

      <form className={styles.form} onSubmit={changePassword} noValidate aria-label="Cambiar contraseña">
        <p className="t-label">Cambiar contraseña</p>
        <TextField
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={passwords.currentPassword}
          onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
          error={errors.currentPassword}
        />
        <TextField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres, con letras y números."
          value={passwords.newPassword}
          onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
          error={errors.newPassword}
        />
        <div>
          <Button type="submit" variant="outline">
            Cambiar contraseña
          </Button>
        </div>
      </form>

      <form className={`${styles.form} ${styles.danger}`} onSubmit={deleteAccount} noValidate aria-label="Eliminar cuenta">
        <p className="t-label">Eliminar cuenta</p>
        <p className="t-small t-muted">
          Se borrarán tus datos de perfil, direcciones y favoritos. Los pedidos se conservan el tiempo que exige la normativa fiscal, desvinculados de tu cuenta.
        </p>
        <TextField
          label="Confirma tu contraseña"
          type="password"
          autoComplete="current-password"
          value={deletePassword}
          onChange={(event) => setDeletePassword(event.target.value)}
          error={errors.password}
        />
        <div>
          <Button type="submit" variant="outline">
            Eliminar mi cuenta
          </Button>
        </div>
      </form>
    </>
  );
}

function RecoverPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(fieldErrors(parsed.error).email);
    setError(undefined);
    setSending(true);
    try {
      await apiRequest('/auth/password/forgot', { method: 'POST', body: parsed.data });
      setResult({ tone: 'success', text: 'Si existe una cuenta con ese email, te hemos enviado un enlace para crear una nueva contraseña. Caduca en 60 minutos.' });
    } catch (failure) {
      setResult({
        tone: failure instanceof ApiError && failure.code === 'email_not_configured' ? 'info' : 'error',
        text: failure instanceof ApiError ? failure.message : 'No se ha podido enviar el email.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Cuenta"
        title="Recuperar contraseña"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Mi cuenta', to: paths.account }, { label: 'Recuperar contraseña' }]}
      />
      <div className="container" style={{ maxWidth: 'calc(520px + var(--gutter) * 2)', paddingBlock: 'var(--space-7) var(--section-y)' }}>
        {result?.tone === 'success' ? (
          <Alert tone="success">{result.text}</Alert>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            <TextField label="Email de tu cuenta" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} error={error} />
            {result && <Alert tone={result.tone === 'info' ? 'info' : 'error'}>{result.text}</Alert>}
            <Button type="submit" size="lg" block loading={sending}>
              Enviar enlace
            </Button>
            <Link to={paths.account} className="link t-small" style={{ justifySelf: 'start' }}>
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </div>
    </>
  );
}

function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const signedIn = useAuth((state) => state.signedIn);
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error);
      setError(errors.password);
      if (errors.token) setFailure('El enlace no es válido. Solicita uno nuevo.');
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      const { user } = await apiRequest<{ user: Parameters<typeof signedIn>[0] }>('/auth/password/reset', { method: 'POST', body: parsed.data });
      await signedIn(user);
      navigate(paths.account, { replace: true });
    } catch (problem) {
      setFailure(problem instanceof ApiError ? problem.message : 'No se ha podido cambiar la contraseña.');
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Cuenta"
        title="Nueva contraseña"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Mi cuenta', to: paths.account }, { label: 'Nueva contraseña' }]}
      />
      <div className="container" style={{ maxWidth: 'calc(520px + var(--gutter) * 2)', paddingBlock: 'var(--space-7) var(--section-y)' }}>
        <form className={styles.form} onSubmit={submit} noValidate>
          <TextField
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            hint="Mínimo 10 caracteres, con letras y números."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error}
          />
          {failure && (
            <Alert>
              {failure} <Link to={paths.accountRecover}>Solicitar otro enlace</Link>
            </Alert>
          )}
          <Button type="submit" size="lg" block loading={sending}>
            Guardar contraseña
          </Button>
        </form>
      </div>
    </>
  );
}
