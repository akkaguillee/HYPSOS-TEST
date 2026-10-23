import { ProductGrid } from '@/components/commerce/ProductGrid';
import { Sticker } from '@/components/brand/Sticker';
import { SprayMark } from '@/components/graffiti/SprayMark';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { getCollection, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import styles from './ChapterDrop.module.css';

const HANDLE = 'drop-01-ascenso';

/** El capítulo actual: titular-objeto, una frase y la rejilla de sus piezas (estilo tienda limpia). */
export function ChapterDrop() {
  const collection = getCollection(HANDLE);
  const items = productsByCollection(HANDLE);
  return (
    <section className="section" data-theme="light" aria-labelledby="chapter-title">
      <div className="container">
        <header className={styles.head}>
          <div className={styles.titleWrap}>
            <p className="eyebrow">
              <Scramble>{`${collection?.name ?? ''} · ${items.length} piezas`}</Scramble>
            </p>
            {/* «Chapter» en gótica y el número comprimido, rodeado a espray. */}
            <SplitHeadline id="chapter-title" className={styles.title}>
              <span className={styles.word}>Chapter</span> <span className={styles.num}>01</span>
            </SplitHeadline>
            <SprayMark variant="circle" drips className={styles.circle} delay={0.5} />
            <Sticker mark="monogram" color="#090909" rotate={8} className={styles.sticker} />
          </div>
          <div className={styles.aside}>
            <p className={styles.lead}>Chapter 01 es el primer paso de la subida HYPSOS. Piezas base, gráficos con intención y la firma roja en cada prenda.</p>
            <ButtonLink to={paths.collection(HANDLE)} variant="outline">
              Ver el capítulo completo
            </ButtonLink>
          </div>
        </header>
        <ProductGrid products={items.slice(0, 8)} columns={4} priorityCount={0} headingLevel="h3" />
      </div>
    </section>
  );
}
