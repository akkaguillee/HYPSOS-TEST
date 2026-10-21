import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Button } from '@/components/ui/Button';
import { Alert, Checkbox, TextField } from '@/components/ui/Field';
import { ApiError, apiRequest } from '@/lib/api';
import { paths } from '@shared/routes';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import styles from './Newsletter.module.css';

type Status = { state: 'idle' | 'loading' } | { state: 'success'; already: boolean } | { state: 'error'; message: string };

export function Newsletter({ source = 'home' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // La validación (zod) se carga bajo demanda para no pesar en la portada.
    const { fieldErrors, newsletterSchema } = await import('@shared/schemas');
    const parsed = newsletterSchema.safeParse({ email, consent, source });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setStatus({ state: 'loading' });
    try {
      const result = await apiRequest<{ status: string }>('/newsletter', { method: 'POST', body: parsed.data });
      setStatus({ state: 'success', already: result.status === 'already_subscribed' });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) setErrors(error.fields);
      setStatus({ state: 'error', message: error instanceof ApiError ? error.message : 'No se ha podido completar la suscripción.' });
    }
  };

  return (
    <section className="section" data-theme="light" aria-labelledby="newsletter-title">
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className="eyebrow">Acceso anticipado</p>
            <SplitHeadline id="newsletter-title" className="t-display">
              Entérate antes
            </SplitHeadline>
            <Reveal>
              <p className="t-lead">Los drops se anuncian primero por email. Solo lanzamientos y ediciones limitadas, sin relleno.</p>
            </Reveal>
          </div>

          <Reveal index={1}>
            {status.state === 'success' ? (
              <Alert tone="success" title={status.already ? 'Ya estabas dentro' : 'Estás dentro'}>
                <p>{status.already ? 'Este email ya estaba suscrito. Te avisaremos del próximo drop.' : 'Te avisaremos antes del próximo drop.'}</p>
              </Alert>
            ) : (
              <form className={styles.form} onSubmit={submit} noValidate>
                <div className={styles.row}>
                  <TextField
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={errors.email}
                  />
                  <Button type="submit" size="lg" loading={status.state === 'loading'}>
                    Suscribirme
                  </Button>
                </div>
                <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} error={errors.consent}>
                  Acepto recibir comunicaciones de HYPSOS y he leído la{' '}
                  <Link to={paths.page('privacidad')}>política de privacidad</Link>. Puedes darte de baja cuando quieras.
                </Checkbox>
                {status.state === 'error' && <Alert>{status.message}</Alert>}
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
