import { CampaignImage } from '@/components/media/CampaignImage';
import { ProductMedia } from '@/components/commerce/ProductMedia';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { limited } from '@/content/campaign';
import { mediaForColor } from '@/lib/product-media';
import { useStock } from '@/store/inventory';
import { productsByCollection, totalStock } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { Product, StockLookup } from '@shared/types';
import { Link } from 'react-router';
import styles from './LimitedDrop.module.css';

const HANDLE = 'signal';

/** Disponibilidad real (solo con el stock cargado): unidades, tirada y estado. */
function availability(product: Product, live: StockLookup, known: boolean) {
  if (!known) return null;
  const units = totalStock(product, live);
  const edition = product.editionSize;
  const label = units === 0 ? 'Agotado' : units <= 5 ? `Quedan ${units}` : 'Disponible';
  return { units, edition, label, tone: units === 0 ? 'out' : units <= 5 ? 'low' : 'ok' };
}

/**
 * Cápsula de tirada corta: texto a la izquierda y, a la derecha, una tarjeta oscura de producto
 * (como el panel en vivo de Cake) con la foto de campaña y las piezas de la cápsula: precio,
 * estado de stock real y, si la pieza tiene tirada declarada, cuánto queda de ella.
 */
export function LimitedDrop() {
  const items = productsByCollection(HANDLE).slice(0, 3);
  const { known, live } = useStock();
  return (
    <section className="section" data-theme="light" aria-labelledby="limited-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className="eyebrow">
            <Scramble>{limited.kicker}</Scramble>
          </p>
          <SplitHeadline id="limited-title" className={styles.title}>
            {limited.title}
          </SplitHeadline>
          <p className={styles.text}>{limited.text}</p>
          <ButtonLink to={limited.cta.to} size="lg">
            {limited.cta.label}
          </ButtonLink>
        </div>

        <article className={styles.card} data-theme="dark" aria-labelledby="limited-card-title">
          <ImageReveal className={styles.photo}>
            <CampaignImage photo={limited.photo} sizes="(min-width: 1024px) 40vw, 92vw" focus="45% 40%" />
          </ImageReveal>
          <header className={styles.cardHead}>
            <h3 id="limited-card-title" className={styles.cardTitle}>
              {limited.accent}
            </h3>
            <span className={styles.receipt}>Tirada corta</span>
          </header>
          <ul role="list" className={styles.rows}>
            {items.map((product) => {
              const media = mediaForColor(product, product.colors[0].id)[0];
              const stock = availability(product, live, known);
              return (
                <li key={product.id}>
                  <Link to={paths.product(product.handle)} className={styles.row} viewTransition>
                    <span className={styles.thumb}>
                      {media && <ProductMedia product={product} media={media} colorId={product.colors[0].id} sizes="64px" decorative />}
                    </span>
                    <span className={styles.info}>
                      <span className={styles.code}>{product.code}</span>
                      <span className={styles.name}>{product.name}</span>
                      {stock?.edition ? (
                        <span className={styles.meter} aria-hidden="true">
                          <span style={{ width: `${Math.min(100, (stock.units / stock.edition) * 100)}%` }} />
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.side}>
                      <Price amount={product.price} compareAt={product.compareAtPrice} className={styles.price} />
                      {stock && (
                        <span className={styles.status} data-tone={stock.tone}>
                          {stock.edition && stock.units > 0 ? `${stock.units} / ${stock.edition}` : stock.label}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
