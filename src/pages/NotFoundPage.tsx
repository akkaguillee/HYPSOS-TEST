import { Mascot } from '@/components/brand/BrandVector';
import { ButtonLink } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { paths } from '@shared/routes';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  useDocumentMeta('/404');
  return (
    <section className={`container ${styles.page}`} aria-labelledby="not-found-title">
      <div className={styles.grid}>
        <div className={styles.copy}>
          <p className={styles.code} aria-hidden="true">
            404
          </p>
          <h1 id="not-found-title" className="t-h1">
            Esta página se ha agotado
          </h1>
          <p className="t-lead">O nunca existió. Lo que sí sigue disponible está aquí:</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.collection('novedades')}>Ver novedades</ButtonLink>
            <ButtonLink to={paths.home} variant="outline">
              Volver al inicio
            </ButtonLink>
          </div>
        </div>
        <Mascot className={styles.mascot} />
      </div>
    </section>
  );
}
