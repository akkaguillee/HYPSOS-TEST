import { ProductCard } from '@/components/commerce/ProductCard';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { featuredProducts, newArrivals } from '@shared/catalog';
import { paths } from '@shared/routes';
import styles from './FeaturedProducts.module.css';

/** Destacados que no se repiten con el carrusel de novedades. */
function pickFeatured() {
  const fresh = new Set(newArrivals().map((product) => product.id));
  const ranked = featuredProducts(99);
  return [...ranked.filter((product) => !fresh.has(product.id)), ...ranked.filter((product) => fresh.has(product.id))].slice(0, 5);
}

export function FeaturedProducts() {
  const [lead, ...rest] = pickFeatured();
  return (
    <section className="section" aria-labelledby="featured-products-title">
      <div className="container">
        <div className="section-head">
          <div className="section-head__titles">
            <p className="eyebrow">Selección</p>
            <SplitHeadline id="featured-products-title" className="t-h2">
              Destacados
            </SplitHeadline>
          </div>
          <ButtonLink to={paths.collection('all')} variant="ghost">
            Ver todo
          </ButtonLink>
        </div>
        <ul role="list" className={styles.bento}>
          <Reveal as="li" className={styles.hero}>
            <ProductCard product={lead} sizes="(min-width: 900px) 48vw, 100vw" />
          </Reveal>
          {rest.map((product, index) => (
            <Reveal as="li" key={product.id} index={index + 1}>
              <ProductCard product={product} sizes="(min-width: 900px) 23vw, 48vw" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
