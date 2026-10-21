import { ActiveFilters, Filters } from '@/components/commerce/Filters';
import { ProductGrid } from '@/components/commerce/ProductGrid';
import { ProductMedia } from '@/components/commerce/ProductMedia';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Field';
import { ChromeMonogram } from '@/components/brand/ChromeMonogram';
import { ThreeStage } from '@/components/three/ThreeStage';
import { track } from '@/lib/analytics';
import {
  activeFilterCount,
  applyFilters,
  emptyFilters,
  PAGE_SIZE,
  parseCatalogParams,
  sortOptions,
  sortProducts,
  toCatalogParams,
  type FilterState,
  type SortKey,
} from '@/lib/catalog-filters';
import { cn } from '@/lib/cn';
import { useStock } from '@/store/inventory';
import { collections, getCategory, getCollection, newArrivals, products, productsByCategory, productsByCollection } from '@shared/catalog';
import { paths, specialCollections } from '@shared/routes';
import type { Product } from '@shared/types';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import styles from './CollectionPage.module.css';
import NotFoundPage from './NotFoundPage';

interface ResolvedCollection {
  title: string;
  eyebrow: string;
  description: string;
  products: Product[];
  variant: 'default' | 'campaign';
  /** Presentación propia de la categoría. */
  layout?: 'lab' | 'stickers';
}

function resolveCollection(handle: string): ResolvedCollection | null {
  if (handle === 'all') return { title: specialCollections.all.name, eyebrow: 'Tienda', description: specialCollections.all.description, products, variant: 'default' };
  if (handle === 'novedades')
    return { title: 'Novedades', eyebrow: 'Recién llegado', description: specialCollections.novedades.description, products: newArrivals(), variant: 'default' };
  const category = getCategory(handle);
  if (category)
    return {
      title: category.name,
      eyebrow: category.handle === '3d' ? 'Laboratorio' : 'Categoría',
      description: category.description,
      products: productsByCategory(category.handle),
      variant: 'default',
      layout: category.handle === '3d' ? 'lab' : category.handle === 'stickers' ? 'stickers' : undefined,
    };
  const collection = getCollection(handle);
  if (collection)
    return {
      title: collection.name,
      eyebrow: `${collection.kicker} · ${collection.tagline}`,
      description: collection.description,
      products: productsByCollection(collection.handle),
      variant: 'campaign',
    };
  return null;
}

export default function CollectionPage() {
  const { handle = '' } = useParams();
  if (handle === 'colecciones') return <CollectionsIndex />;
  const resolved = resolveCollection(handle);
  if (!resolved) return <NotFoundPage />;
  return <CatalogView key={handle} handle={handle} collection={resolved} />;
}

function CatalogView({ handle, collection }: { handle: string; collection: ResolvedCollection }) {
  const [params, setParams] = useSearchParams();
  const { filters, sort, page } = parseCatalogParams(params);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortId = useId();
  const { lookup, status: stockStatus } = useStock();

  const visible = sortProducts(applyFilters(collection.products, filters, lookup), sort, lookup);
  const shown = visible.slice(0, page * PAGE_SIZE);
  const remaining = visible.length - shown.length;
  const activeCount = activeFilterCount(filters);
  const update = (nextFilters: FilterState, nextSort: SortKey = sort) => {
    // Registro anónimo del uso de filtros (solo con consentimiento).
    (['sizes', 'colors', 'prices', 'categories'] as const).forEach((key) =>
      nextFilters[key].filter((value) => !(filters[key] as string[]).includes(value)).forEach((value) => track('filter', { filter: key, value })),
    );
    if (nextSort !== sort) track('filter', { filter: 'orden', value: nextSort });
    setParams(toCatalogParams(nextFilters, nextSort), { replace: true, preventScrollReset: true });
  };
  const loadMore = () => setParams(toCatalogParams(filters, sort, page + 1), { replace: true, preventScrollReset: true });

  const crumbs = [{ label: 'Inicio', to: paths.home }, ...(handle !== 'all' ? [{ label: 'Tienda', to: paths.collection('all') }] : []), { label: collection.title }];

  return (
    <>
      <PageHeader
        title={collection.title}
        eyebrow={collection.eyebrow}
        description={collection.description}
        breadcrumbs={crumbs}
        variant={collection.variant}
        aside={`${collection.products.length} ${collection.products.length === 1 ? 'producto' : 'productos'}`}
      >
        {collection.layout === 'lab' && (
          <div className={styles.lab}>
            <ThreeStage
              source={{ kind: 'monogram' }}
              label="Monograma H de HYPSOS en 3D"
              className={styles.labStage}
              poster={<ChromeMonogram sizes="(min-width: 1024px) 50vw, 100vw" alt="" />}
            />
            <p className={styles.labNote}>
              Las piezas con modelo 3D real se podrán girar desde su ficha. Mientras tanto, las imágenes de esta sección son provisionales.
            </p>
          </div>
        )}
      </PageHeader>

      <div className={styles.toolbar}>
        <div className={`container ${styles.toolbarInner}`}>
          <button type="button" className={`${styles.filterButton} ${styles.mobileOnly}`} onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden="true" />
            Filtrar
            {activeCount > 0 && <span className={styles.filterCount}>{activeCount}</span>}
          </button>
          <p className={styles.resultCount} aria-live="polite">
            {stockStatus === 'loading' ? 'Comprobando disponibilidad…' : `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}`}
          </p>
          <div className={styles.sort}>
            <label htmlFor={sortId}>Ordenar</label>
            <select id={sortId} value={sort} onChange={(event) => update(filters, event.target.value as SortKey)}>
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={`container ${styles.body}`}>
        <aside className={styles.sidebar} aria-label="Filtros">
          <Filters products={collection.products} filters={filters} onChange={(next) => update(next)} />
        </aside>

        <div className={styles.results}>
          <ActiveFilters products={collection.products} filters={filters} onChange={(next) => update(next)} />
          {stockStatus === 'error' && (
            <Alert tone="info">
              <p>No hemos podido comprobar la disponibilidad. Se verificará al finalizar la compra.</p>
            </Alert>
          )}
          {visible.length > 0 ? (
            <>
              <div className={cn(collection.layout === 'stickers' && styles.stickerGrid)}>
                <ProductGrid products={shown} columns={collection.layout === 'stickers' ? 4 : 3} priorityCount={3} headingLevel="h2" />
              </div>
              <div className={styles.pagination}>
                <p className="t-small t-muted" aria-live="polite">
                  Mostrando {shown.length} de {visible.length}
                </p>
                <div className={styles.paginationTrack} aria-hidden="true">
                  <span style={{ transform: `scaleX(${shown.length / visible.length})` }} />
                </div>
                {remaining > 0 && (
                  <Button variant="outline" onClick={loadMore}>
                    Cargar {Math.min(remaining, PAGE_SIZE)} más
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <p className="t-h3">Ningún producto coincide con estos filtros</p>
              <p className="t-muted t-small">Prueba a quitar alguno o explora toda la tienda.</p>
              <Button variant="outline" onClick={() => update(emptyFilters)}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtrar"
        side="left"
        footer={
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <Button block size="lg" onClick={() => setFiltersOpen(false)}>
              Ver {visible.length} {visible.length === 1 ? 'producto' : 'productos'}
            </Button>
            {activeCount > 0 && (
              <Button block variant="ghost" onClick={() => update(emptyFilters)}>
                Limpiar filtros
              </Button>
            )}
          </div>
        }
      >
        <div className={styles.drawerBody}>
          <Filters products={collection.products} filters={filters} onChange={(next) => update(next)} />
        </div>
      </Drawer>
    </>
  );
}

function CollectionsIndex() {
  const sorted = [...collections].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  return (
    <>
      <PageHeader
        title={specialCollections.colecciones.name}
        eyebrow="Archivo"
        description={specialCollections.colecciones.description}
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Colecciones' }]}
      />
      <div className={`container ${styles.collections}`}>
        {sorted.map((collection, index) => {
          const items = productsByCollection(collection.handle);
          return (
            <Reveal key={collection.handle} index={index}>
              <Link to={paths.collection(collection.handle)} className={styles.collectionCard} viewTransition>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <p className="eyebrow">{collection.kicker}</p>
                  <h2 className={styles.collectionName}>{collection.name}</h2>
                  <p className="t-lead">{collection.tagline}</p>
                  <div className={styles.collectionThumbs} aria-hidden="true">
                    {items.slice(0, 4).map((product) => (
                      <span key={product.id} className={styles.collectionThumb}>
                        <ProductMedia product={product} media={product.media[0]} compact decorative sizes="64px" />
                      </span>
                    ))}
                  </div>
                </div>
                <span className={styles.collectionMeta}>
                  {items.length} piezas
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
