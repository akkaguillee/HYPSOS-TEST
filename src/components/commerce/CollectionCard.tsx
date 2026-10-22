import { getProductByHandle, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { Collection } from '@shared/types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import styles from './CollectionCard.module.css';
import { ProductMedia } from './ProductMedia';

interface CollectionCardProps {
  collection: Collection;
  headingLevel?: 'h2' | 'h3';
  sizes?: string;
}

/** Tarjeta de colección: su prenda representativa sobre fondo de estudio, nombre y recuento. Toda la tarjeta es el enlace. */
export function CollectionCard({ collection, headingLevel: Heading = 'h3', sizes = '(min-width: 768px) 32vw, 80vw' }: CollectionCardProps) {
  const cover = getProductByHandle(collection.cover.handle);
  const count = productsByCollection(collection.handle).length;
  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {cover && (
          <ProductMedia
            product={cover}
            media={{ type: 'mockup', view: collection.cover.view }}
            colorId={collection.cover.colorId}
            sizes={sizes}
            decorative
          />
        )}
      </div>
      <div className={styles.copy}>
        <p className={styles.meta}>
          <span>{collection.kicker}</span>
          <span className="t-num">{count} piezas</span>
        </p>
        <Heading className={styles.name}>
          <Link to={paths.collection(collection.handle)} className={styles.link} viewTransition>
            {collection.name}
            <ArrowRight className={styles.arrow} aria-hidden="true" />
          </Link>
        </Heading>
        <p className={styles.tagline}>{collection.tagline}</p>
      </div>
    </article>
  );
}
