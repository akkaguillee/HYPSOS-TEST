import { BrandPanel, type PanelMark, type PanelTone } from '@/components/brand/BrandPanel';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { collections, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import styles from './FeaturedCollections.module.css';

/** Cada colección se presenta con una marca oficial distinta sobre un color sólido de la paleta. */
const artwork: Record<string, { tone: PanelTone; mark: PanelMark }> = {
  'drop-01-ascenso': { tone: 'light', mark: 'monogram' },
  signal: { tone: 'black', mark: 'star' },
  base: { tone: 'graphite', mark: 'mascot' },
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
      </div>
      <ul role="list" className={styles.track}>
        {collections.map((collection, index) => {
          const count = productsByCollection(collection.handle).length;
          const art = artwork[collection.handle] ?? { tone: 'graphite', mark: 'monogram' };
          return (
            <Reveal as="li" key={collection.handle} className={styles.card} index={index}>
              <BrandPanel tone={art.tone} mark={art.mark} accent={art.mark !== 'star'} className={styles.art} />
              <div className={styles.copy}>
                <p className={styles.meta}>
                  <span>{collection.kicker}</span>
                  <span className="t-num">{count} piezas</span>
                </p>
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
    </section>
  );
}
