import { Mascot, Star } from '@/components/brand/BrandVector';
import { ChromeMonogram } from '@/components/brand/ChromeMonogram';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { collections, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './FeaturedCollections.module.css';

/** Cada colección se presenta con un recurso oficial de marca distinto. */
const artwork: Record<string, ReactNode> = {
  'drop-01-ascenso': <ChromeMonogram className={styles.chrome} sizes="(min-width: 1024px) 45vw, 100vw" alt="" />,
  signal: <Star className={styles.star} />,
  base: <Mascot className={styles.mascot} />,
};

export function FeaturedCollections() {
  return (
    <section className="section" aria-labelledby="collections-title">
      <div className="container">
        <div className="section-head">
          <div className="section-head__titles">
            <p className="eyebrow">Colecciones</p>
            <SplitHeadline id="collections-title" className="t-h2">
              Elige tu capítulo
            </SplitHeadline>
          </div>
          <ButtonLink to={paths.collection('colecciones')} variant="ghost">
            Todas las colecciones
          </ButtonLink>
        </div>
        <ul role="list" className={styles.panels}>
          {collections.map((collection, index) => {
            const count = productsByCollection(collection.handle).length;
            return (
              <Reveal as="li" key={collection.handle} className={styles.panel} index={index} variant="mask">
                <div className={styles.art} aria-hidden="true">
                  {artwork[collection.handle]}
                </div>
                <div className={styles.shade} aria-hidden="true" />
                <span className={styles.count}>
                  {collection.kicker} · {count} piezas
                </span>
                <div className={styles.copy}>
                  <h3 className={styles.name}>
                    <Link to={paths.collection(collection.handle)} className={styles.link} viewTransition>
                      {collection.name}
                    </Link>
                  </h3>
                  <p className={styles.tagline}>{collection.tagline}</p>
                  <span className={styles.cta} aria-hidden="true">
                    Ver colección <ArrowRight />
                  </span>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
