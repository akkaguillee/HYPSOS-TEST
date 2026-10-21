import { ChromeMonogram } from '@/components/brand/ChromeMonogram';
import { ProductMedia } from '@/components/commerce/ProductMedia';
import { Parallax } from '@/components/motion/Parallax';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { getCollection, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './FeaturedCollection.module.css';

const HANDLE = 'drop-01-ascenso';

export function FeaturedCollection() {
  const collection = getCollection(HANDLE)!;
  const items = productsByCollection(HANDLE).sort((a, b) => a.featuredRank - b.featuredRank);
  const limited = items.filter((product) => product.badges.includes('edicion-limitada')).length;

  return (
    <section className={`section ${styles.section}`} aria-labelledby="featured-title">
      <div className="container">
        <div className={styles.grid}>
          <Reveal variant="mask" className={styles.visual}>
            <Parallax className={styles.visualMedia} amount={6}>
              <ChromeMonogram className={styles.chrome} sizes="(min-width: 1024px) 55vw, 100vw" alt="" />
            </Parallax>
            <div className={styles.visualCaption} aria-hidden="true">
              <span>
                {collection.kicker} / {collection.name}
              </span>
              <span>2026</span>
            </div>
          </Reveal>

          <div className={styles.copy}>
            <p className="eyebrow">{collection.kicker}</p>
            <SplitHeadline id="featured-title" className="t-display">
              {collection.name}
            </SplitHeadline>
            <Reveal>
              <p className="t-lead">{collection.description}</p>
            </Reveal>
            <Reveal className={styles.stats} index={1}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{items.length}</span>
                <span className={styles.statLabel}>Piezas</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{limited}</span>
                <span className={styles.statLabel}>Ed. limitadas</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>450</span>
                <span className={styles.statLabel}>g/m² máx.</span>
              </div>
            </Reveal>
            <Reveal className={styles.mini} index={2}>
              {items.slice(0, 3).map((product) => (
                <Link key={product.id} to={paths.product(product.handle)} className={styles.miniItem} viewTransition>
                  <span className={styles.miniThumb}>
                    <ProductMedia product={product} media={product.media[0]} compact decorative sizes="56px" />
                  </span>
                  <span>{product.name}</span>
                  <Price amount={product.price} />
                </Link>
              ))}
            </Reveal>
            <Reveal index={3}>
              <ButtonLink to={paths.collection(HANDLE)} size="lg">
                Ver la colección
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
