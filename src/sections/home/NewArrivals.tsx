import { ProductRail } from '@/components/commerce/ProductRail';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { newArrivals } from '@shared/catalog';
import { paths } from '@shared/routes';

export function NewArrivals() {
  const products = newArrivals();
  return (
    <section className="section" aria-labelledby="new-arrivals-title">
      <ProductRail
        products={products}
        label="Novedades"
        header={(controls) => (
          <div className="section-head">
            <div className="section-head__titles">
              <p className="eyebrow">Recién llegado</p>
              <SplitHeadline id="new-arrivals-title" className="t-h2">
                Novedades
              </SplitHeadline>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <ButtonLink to={paths.collection('novedades')} variant="ghost">
                Ver todo
              </ButtonLink>
              {controls}
            </div>
          </div>
        )}
      />
    </section>
  );
}
