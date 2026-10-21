import { Wordmark } from '@/components/brand/BrandVector';
import { isRouteErrorResponse, useRouteError } from 'react-router';

/**
 * Error de ruta (p. ej. un fragmento de código que no carga tras un despliegue).
 * Se muestra sin depender del layout para que nunca quede la pantalla en negro.
 */
export function RouteError() {
  const error = useRouteError();
  const isChunkError = error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message);
  if (import.meta.env.DEV) console.error(error);

  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--gutter)',
        background: 'var(--c-black)',
        color: 'var(--c-white)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-5)', justifyItems: 'center', maxWidth: 520 }}>
        <Wordmark title="HYPSOS" style={{ width: 160 }} />
        <h1 className="t-h2">{isRouteErrorResponse(error) && error.status === 404 ? 'Página no encontrada' : 'Algo ha fallado'}</h1>
        <p className="t-muted">
          {isChunkError
            ? 'Hemos publicado una nueva versión de la web. Recarga la página para continuar.'
            : 'Ha ocurrido un error inesperado. Recarga la página o vuelve al inicio.'}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ minHeight: 48, padding: '0 24px', background: 'var(--c-white)', color: 'var(--c-black)', fontWeight: 650, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            Recargar
          </button>
          <a href="/" style={{ minHeight: 48, padding: '0 24px', display: 'inline-grid', placeItems: 'center', border: '1px solid var(--line-strong)', fontWeight: 650, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Inicio
          </a>
        </div>
      </div>
    </main>
  );
}
