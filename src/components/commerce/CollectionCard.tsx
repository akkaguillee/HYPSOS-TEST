import { cn } from '@/lib/cn';
import { getProductByHandle, productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { Collection, Product } from '@shared/types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import styles from './CollectionCard.module.css';
import { ProductMedia } from './ProductMedia';

interface CollectionCardProps {
  collection: Collection;
  headingLevel?: 'h2' | 'h3';
  /** Imágenes a la izquierda y texto a la derecha (para alternar bloques en el índice). */
  reverse?: boolean;
  /** Carga prioritaria de las imágenes (primer bloque sobre el pliegue). */
  priority?: boolean;
}

/** Piezas que representan la colección: su prenda de portada primero y después por relevancia. */
function pickPieces(collection: Collection, items: Product[]): { product: Product; colorId?: string; view: 'front' | 'back' | 'detail' }[] {
  const cover = getProductByHandle(collection.cover.handle);
  const rest = items.filter((product) => product.handle !== collection.cover.handle).sort((a, b) => a.featuredRank - b.featuredRank);
  return [
    ...(cover ? [{ product: cover, colorId: collection.cover.colorId, view: collection.cover.view }] : []),
    ...rest.map((product) => ({ product, view: 'front' as const })),
  ].slice(0, 3);
}

/**
 * Bloque editorial de colección: capítulo, nombre comprimido, entradilla y una tira de tres piezas
 * reales sobre el fondo de estudio. Todo el bloque es el enlace (enlace estirado).
 */
export function CollectionCard({ collection, headingLevel: Heading = 'h3', reverse, priority }: CollectionCardProps) {
  const items = productsByCollection(collection.handle);
  const pieces = pickPieces(collection, items);
  return (
    <article className={cn(styles.card, reverse && styles.reverse)}>
      <div className={styles.copy}>
        <div className={styles.titles}>
          <p className={styles.meta}>
            <span>{collection.kicker}</span>
            <span className="t-num">
              {items.length} {items.length === 1 ? 'pieza' : 'piezas'}
            </span>
          </p>
          <Heading className={styles.name}>
            <Link to={paths.collection(collection.handle)} className={styles.link} viewTransition>
              {collection.name}
            </Link>
          </Heading>
          <p className={styles.tagline}>{collection.tagline}</p>
        </div>
        <p className={styles.description}>{collection.description}</p>
        <span className={styles.cta} aria-hidden="true">
          Ver colección
          <ArrowRight className={styles.arrow} />
        </span>
      </div>
      <div className={styles.strip} aria-hidden="true">
        {pieces.map(({ product, colorId, view }, index) => (
          <span key={product.id} className={styles.tile}>
            <ProductMedia
              product={product}
              media={product.media.find((media) => media.type === 'mockup' && media.view === view) ?? product.media[0]}
              colorId={colorId}
              sizes="(min-width: 1536px) 300px, (min-width: 1024px) 20vw, (min-width: 768px) 31vw, 46vw"
              priority={priority && index < 2}
              decorative
            />
          </span>
        ))}
      </div>
    </article>
  );
}
