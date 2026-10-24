import { Mascot } from '@/components/brand/BrandVector';
import { ButtonLink } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './NotFoundPage.module.css';

const exits = [
  { to: paths.collection('all'), label: 'Toda la tienda' },
  { to: paths.page('faq'), label: 'Preguntas frecuentes' },
  { to: paths.page('contacto'), label: 'Contacto' },
];

export default function NotFoundPage() {
  useDocumentMeta('/404');
  return (
    <div className={`container ${styles.page}`}>
      <section className={styles.poster} data-theme="dark" aria-labelledby="not-found-title">
        <p className={styles.label}>Error 404 · Página no encontrada</p>
        <div className={styles.codeWrap} aria-hidden="true">
          <span className={styles.code}>404</span>
          <span className={styles.sticker}>
            <Mascot />
          </span>
        </div>
        <div className={styles.copy}>
          <h1 id="not-found-title" className={styles.title}>
            Esta página se ha agotado
          </h1>
          <p className={styles.lead}>O nunca existió. Lo que sí sigue disponible está aquí:</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.collection('novedades')} size="lg">
              Ver novedades
            </ButtonLink>
            <ButtonLink to={paths.home} variant="outline" size="lg">
              Volver al inicio
            </ButtonLink>
          </div>
          <nav aria-label="Otras páginas">
            <ul role="list" className={styles.exits}>
              {exits.map((exit) => (
                <li key={exit.to}>
                  <Link to={exit.to} className={styles.exit} viewTransition>
                    {exit.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </div>
  );
}
