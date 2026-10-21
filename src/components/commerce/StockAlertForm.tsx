import { OfflineNotice } from '@/components/ui/OfflineNotice';
import { useServerOffline } from '@/store/storeStatus';
import { Button } from '@/components/ui/Button';
import { Alert, Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

interface StockAlertFormProps {
  product: Product;
  colorId: string;
  /** Tallas agotadas del color elegido (la primera se preselecciona). */
  sizes: string[];
}

/** «Avísame»: guarda la petición de aviso cuando una variante agotada vuelva a tener stock. */
export function StockAlertForm({ product, colorId, sizes }: StockAlertFormProps) {
  const user = useAuth((state) => state.user);
  const [size, setSize] = useState(sizes[0]);
  const [email, setEmail] = useState(user?.email ?? '');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const offline = useServerOffline();
  const [failure, setFailure] = useState<string | null>(null);
  const color = product.colors.find((candidate) => candidate.id === colorId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Introduce un email válido';
    if (!consent) next.consent = 'Necesitamos tu consentimiento para avisarte';
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus('sending');
    try {
      await apiRequest('/stock-alerts', { method: 'POST', body: { email: email.trim(), productId: product.id, colorId, size, consent } });
      setStatus('done');
    } catch (error) {
      setStatus('idle');
      if (error instanceof ApiError) setErrors(error.fields);
      setFailure(error instanceof ApiError ? error.message : 'No se ha podido guardar el aviso.');
    }
  };

  if (status === 'done') {
    return (
      <Alert tone="success" title="Te avisaremos">
        <p>
          Cuando {product.name} en {color?.name.toLowerCase()} talla {size} vuelva a estar disponible, te escribiremos a {email.trim()}.
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 'var(--space-3)' }} aria-label="Avísame cuando vuelva">
      <OfflineNotice>Los avisos de reposición necesitan el servidor de la tienda, que no está activo en esta versión de la web.</OfflineNotice>
      <p className="t-small t-muted">Déjanos tu email y te avisamos si vuelve a haber stock.</p>
      {sizes.length > 1 && (
        <SelectField label="Talla" value={size} onChange={(event) => setSize(event.target.value)} options={sizes.map((value) => ({ value, label: value }))} />
      )}
      <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} />
      <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} error={errors.consent}>
        Acepto que HYPSOS use mi email solo para este aviso (<Link to={paths.page('privacidad')}>privacidad</Link>).
      </Checkbox>
      {failure && <Alert>{failure}</Alert>}
      <Button type="submit" variant="outline" loading={status === 'sending'} disabled={offline}>
        Avísame
      </Button>
    </form>
  );
}
