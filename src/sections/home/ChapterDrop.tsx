import { ProductGrid } from '@/components/commerce/ProductGrid';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { getCollection, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import styles from './ChapterDrop.module.css';

const HANDLE = 'drop-01-ascenso';

/**
 * El capítulo actual en banda blanca (Shelby): etiqueta tipo código encima, titular enorme
 * centrado, una frase y la rejilla de sus piezas con tarjetas de borde fino (Cake).
 */
export function ChapterDrop() {
  const collection = getCollection(HANDLE);
  const items = productsByCollection(HANDLE);
  return (
    <section className="section" data-theme="light" aria-labelledby="chapter-title">
      <div className="container">
        <header className={styles.head}>
          <p className="eyebrow">
            <Scramble>{`${collection?.name ?? ''} / ${items.length} piezas`}</Scramble>
          </p>
          <SplitHeadline id="chapter-title" className={styles.title}>
            Chapter 01
          </SplitHeadline>
          <p className={styles.lead}>Chapter 01 es el primer paso de la subida HYPSOS. Piezas base, gráficos con intención y la firma roja en cada prenda.</p>
          <ButtonLink to={paths.collection(HANDLE)} variant="outline">
            Ver el capítulo completo
          </ButtonLink>
        </header>
        <ProductGrid products={items.slice(0, 8)} columns={4} priorityCount={0} headingLevel="h3" />
      </div>
    </section>
  );
}
