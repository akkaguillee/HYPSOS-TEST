import { Sticker } from '@/components/brand/Sticker';
import { useServerOffline } from '@/store/storeStatus';
import { Button } from '@/components/ui/Button';
import { Alert, Checkbox, TextField } from '@/components/ui/Field';
import { track } from '@/lib/analytics';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuth, type AccountUser } from '@/store/auth';
import { paths } from '@shared/routes';
import { fieldErrors, loginSchema, registerSchema } from '@shared/schemas';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { safeNext } from '@/lib/safe-next';
import styles from './Account.module.css';

type Mode = 'login' | 'register';

export function AuthForms({ notice }: { notice?: ReactNode }) {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get('modo') === 'registro' ? 'register' : 'login');
  const baseId = useId();

  return (
    <div className={styles.auth}>
      <div className={styles.authMain}>
        {notice}
        <div className={styles.tabs} role="tablist" aria-label="Acceso a tu cuenta">
          {(['login', 'register'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`${baseId}-${value}-tab`}
              aria-selected={mode === value}
              aria-controls={`${baseId}-${value}-panel`}
              className={styles.tab}
              onClick={() => setMode(value)}
            >
              {value === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${baseId}-${mode}-panel`} aria-labelledby={`${baseId}-${mode}-tab`}>
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
      <aside className={styles.benefits} data-theme="dark" aria-label="Ventajas de la cuenta">
        <Sticker mark="mascot" rotate={-8} className={styles.benefitsSticker} />
        <p className={styles.benefitsTitle}>Tu cuenta HYPSOS</p>
        <ul role="list" className={styles.benefitsList}>
          {['Historial y estado de tus pedidos', 'Direcciones guardadas para pagar más rápido', 'Favoritos sincronizados en todos tus dispositivos'].map((text, index) => (
            <li key={text}>
              <span className={styles.benefitsIndex}>0{index + 1}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className={styles.benefitsNote}>No necesitas cuenta para comprar.</p>
      </aside>
    </div>
  );
}

function useAfterSignIn() {
  const signedIn = useAuth((state) => state.signedIn);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return async (user: AccountUser) => {
    await signedIn(user);
    navigate(safeNext(params.get('next')), { replace: true });
  };
}

function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const offline = useServerOffline();
  const after = useAfterSignIn();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const { user } = await apiRequest<{ user: AccountUser }>('/auth/login', { method: 'POST', body: parsed.data });
      await after(user);
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'No se ha podido iniciar sesión.');
      setSending(false);
    }
  };

  return (
    <form ref={form} className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={values.email}
        onChange={(event) => setValues({ ...values, email: event.target.value })}
        error={errors.email}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        value={values.password}
        onChange={(event) => setValues({ ...values, password: event.target.value })}
        error={errors.password}
      />
      {failure && <Alert>{failure}</Alert>}
      <Button type="submit" size="lg" block loading={sending} disabled={offline}>
        Entrar
      </Button>
      <Link to={paths.accountRecover} className={styles.textLink}>
        ¿Has olvidado tu contraseña?
      </Link>
    </form>
  );
}

function RegisterForm() {
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const offline = useServerOffline();
  const after = useAfterSignIn();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const parsed = registerSchema.safeParse({ ...values, acceptTerms, marketingOptIn });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const { user } = await apiRequest<{ user: AccountUser }>('/auth/register', { method: 'POST', body: parsed.data });
      track('sign_up', {});
      await after(user);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      setFailure(error instanceof ApiError ? error.message : 'No se ha podido crear la cuenta.');
      setSending(false);
    }
  };

  return (
    <form ref={form} className={styles.form} onSubmit={submit} noValidate>
      <TextField label="Nombre" autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} error={errors.name} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={values.email}
        onChange={(event) => setValues({ ...values, email: event.target.value })}
        error={errors.email}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 10 caracteres, con letras y números."
        value={values.password}
        onChange={(event) => setValues({ ...values, password: event.target.value })}
        error={errors.password}
      />
      <Checkbox checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} error={errors.acceptTerms}>
        He leído la <Link to={paths.page('privacidad')}>política de privacidad</Link>.
      </Checkbox>
      <Checkbox checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)}>
        Quiero recibir novedades de HYPSOS por email.
      </Checkbox>
      {failure && <Alert>{failure}</Alert>}
      <Button type="submit" size="lg" block loading={sending} disabled={offline}>
        Crear cuenta
      </Button>
    </form>
  );
}
