import { Mascot } from '@/components/brand/BrandVector';
import { Wordmark } from '@/components/brand/BrandVector';
import { Button } from '@/components/ui/Button';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import styles from './NotFoundPage.module.css';

/**
 * Error de ruta (p. ej. un fragmento de código que no carga tras un despliegue).
 * Se muestra sin depender del layout para que nunca quede la pantalla en negro.
 */
export function RouteError() {
  const error = useRouteError();
  const isChunkError = error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message);
  if (import.meta.env.DEV) console.error(error);

  return (
    <main className={styles.errorPage} data-theme="dark">
      <div className={styles.errorInner}>
        <Wordmark title="HYPSOS" className={styles.errorWordmark} />
        <Mascot className={styles.errorSticker} />
        <h1 className={styles.title}>{isRouteErrorResponse(error) && error.status === 404 ? 'Página no encontrada' : 'Algo ha fallado'}</h1>
        <p className={styles.lead}>
          {isChunkError
            ? 'Hemos publicado una nueva versión de la web. Recarga la página para continuar.'
            : 'Ha ocurrido un error inesperado. Recarga la página o vuelve al inicio.'}
        </p>
        <div className={styles.actions}>
          <Button size="lg" onClick={() => window.location.reload()}>
            Recargar
          </Button>
          {/* Navegación completa (no del router): el estado de la app puede estar roto. */}
          <Button size="lg" variant="outline" onClick={() => window.location.assign('/')}>
            Inicio
          </Button>
        </div>
      </div>
    </main>
  );
}
