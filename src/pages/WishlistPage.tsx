import { ProductGrid } from '@/components/commerce/ProductGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { useWishlist } from '@/store/wishlist';
import { getProductById } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';

export default function WishlistPage() {
  const ids = useWishlist((state) => state.productIds);
  const saved = ids.map(getProductById).filter((product): product is Product => Boolean(product));

  return (
    <>
      <PageHeader
        title="Favoritos"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Favoritos' }]}
        description="Guardados en este dispositivo."
        aside={saved.length ? `${saved.length} ${saved.length === 1 ? 'producto' : 'productos'}` : undefined}
      />
      <div className="container" style={{ paddingBlock: 'var(--space-7) var(--section-y)' }}>
        {saved.length > 0 ? (
          <ProductGrid products={saved} headingLevel="h2" />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-4)', justifyItems: 'start' }}>
            <p className="t-h3">Aún no has guardado nada</p>
            <p className="t-muted">Pulsa el corazón de cualquier producto para tenerlo a mano.</p>
            <ButtonLink to={paths.collection('novedades')}>Ver novedades</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
