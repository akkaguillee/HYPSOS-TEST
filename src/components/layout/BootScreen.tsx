import { Wordmark } from '@/components/brand/BrandVector';

/** Pantalla mínima mientras se carga el código de la primera página (misma estética que index.html). */
export function BootScreen() {
  return (
    <div role="status" aria-label="Cargando HYPSOS" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--c-coffee)' }}>
      <Wordmark style={{ width: 'min(56vw, 360px)', color: 'var(--c-white)' }} />
    </div>
  );
}
