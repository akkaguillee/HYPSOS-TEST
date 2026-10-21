import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Alert, Checkbox, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { ApiError, apiRequest } from '@/lib/api';
import { store } from '@shared/config';
import { paths } from '@shared/routes';
import { contactSchema, fieldErrors } from '@shared/schemas';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import styles from './Contact.module.css';

const subjects = [
  { value: 'pedido', label: 'Un pedido' },
  { value: 'devolucion', label: 'Cambio o devolución' },
  { value: 'producto', label: 'Producto o tallas' },
  { value: 'colaboracion', label: 'Colaboraciones y prensa' },
  { value: 'otro', label: 'Otro' },
];

const initial = { name: '', email: '', subject: '', orderNumber: '', message: '', website: '' };

export function ContactPage() {
  const [values, setValues] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [failure, setFailure] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const bind = (name: keyof typeof initial) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [name]: event.target.value })),
    error: errors[name],
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const parsed = contactSchema.safeParse({ ...values, consent });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setStatus('sending');
    try {
      await apiRequest('/contact', { method: 'POST', body: parsed.data });
      setStatus('sent');
    } catch (error) {
      setStatus('idle');
      if (error instanceof ApiError && Object.keys(error.fields).length) setErrors(error.fields);
      setFailure(error instanceof ApiError ? error.message : 'No se ha podido enviar el mensaje.');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Ayuda"
        title="Contacto"
        description="Pedidos, devoluciones, tallas o colaboraciones: escríbenos y te respondemos."
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Contacto' }]}
      />
      <div className={`container ${styles.layout}`}>
        <div className={styles.info}>
          {store.policies.responseTime && (
            <div className={styles.infoBlock}>
              <p className="t-label">Tiempo de respuesta</p>
              <p>Respondemos en {store.policies.responseTime}.</p>
            </div>
          )}
          {store.contact.email && (
            <div className={styles.infoBlock}>
              <p className="t-label">Email</p>
              <a href={`mailto:${store.contact.email}`} className="link">
                {store.contact.email}
              </a>
            </div>
          )}
          <div className={styles.infoBlock}>
            <p className="t-label">Antes de escribir</p>
            <p>
              Quizá tu respuesta ya esté en las <Link to={paths.page('faq')} className="link">preguntas frecuentes</Link> o en{' '}
              <Link to={paths.page('envios')} className="link">envíos y devoluciones</Link>.
            </p>
          </div>
        </div>

        {status === 'sent' ? (
          <Alert tone="success" title="Mensaje recibido">
            <p>
              Gracias, {values.name.split(' ')[0]}. Te responderemos {store.policies.responseTime ? `en ${store.policies.responseTime}` : 'lo antes posible'}.
            </p>
          </Alert>
        ) : (
          <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
            <TextField label="Nombre" autoComplete="name" {...bind('name')} />
            <TextField label="Email" type="email" autoComplete="email" inputMode="email" {...bind('email')} />
            <SelectField label="Motivo" options={subjects} placeholder="Selecciona un motivo" {...bind('subject')} />
            <TextField label="Número de pedido" optional {...bind('orderNumber')} />
            <TextArea className={styles.full} label="Mensaje" rows={6} {...bind('message')} />
            <div className={styles.honeypot} aria-hidden="true">
              <label>
                No rellenes este campo
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  name="website"
                  value={values.website}
                  onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
                />
              </label>
            </div>
            <Checkbox className={styles.full} checked={consent} onChange={(event) => setConsent(event.target.checked)} error={errors.consent}>
              He leído la <Link to={paths.page('privacidad')}>política de privacidad</Link> y acepto que se usen mis datos para responder a mi consulta.
            </Checkbox>
            {failure && (
              <div className={styles.full}>
                <Alert>{failure}</Alert>
              </div>
            )}
            <div className={styles.full}>
              <Button type="submit" size="lg" loading={status === 'sending'}>
                Enviar mensaje
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
