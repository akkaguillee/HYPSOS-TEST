import { EndTile, ProductGrid } from '@/components/commerce/ProductGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { useWishlist } from '@/store/wishlist';
import { featuredProducts, getProductById } from '@shared/catalog';
import { listingColumns } from '@shared/catalog/listing';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';
import { Heart } from 'lucide-react';

export default function WishlistPage() {
  const ids = useWishlist((state) => state.productIds);
  const saved = ids.map(getProductById).filter((product): product is Product => Boolean(product));
  const ideas = featuredProducts(4);

  return (
    <>
      <PageHeader
        variant="listing"
        title="Favoritos"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Favoritos' }]}
        description="Guardados en este dispositivo."
        count={saved.length ? { value: saved.length, label: saved.length === 1 ? 'producto' : 'productos' } : undefined}
      />
      <div className="container" style={{ paddingBlock: 'var(--space-5) var(--section-y)' }}>
        {saved.length > 0 ? (
          <ProductGrid
            products={saved}
            columns={listingColumns(saved.length)}
            headingLevel="h2"
            endTile={<EndTile kicker="HYPSOS" title="Built for the climb." to={paths.collection('all')} cta="Seguir explorando" />}
          />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-9)' }}>
            <div style={{ display: 'grid', gap: 'var(--space-4)', justifyItems: 'start', maxWidth: '44ch' }}>
              <Heart aria-hidden="true" size={28} strokeWidth={1.5} />
              <p className="t-h2">Aún no has guardado nada</p>
              <p className="t-muted">Pulsa el corazón de cualquier producto para tenerlo a mano. Se guarda en este dispositivo.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <ButtonLink to={paths.collection('novedades')}>Ver novedades</ButtonLink>
                <ButtonLink to={paths.collection('all')} variant="outline">
                  Toda la tienda
                </ButtonLink>
              </div>
            </div>
            <section aria-labelledby="wishlist-ideas" style={{ display: 'grid', gap: 'var(--space-5)' }}>
              <h2 id="wishlist-ideas" className="eyebrow">
                Para empezar
              </h2>
              <ProductGrid products={ideas} columns={listingColumns(ideas.length)} headingLevel="h3" />
            </section>
          </div>
        )}
      </div>
    </>
  );
}
