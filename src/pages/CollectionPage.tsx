import { Mascot, Monogram, Star } from '@/components/brand/BrandVector';
import { CollectionCard } from '@/components/commerce/CollectionCard';
import { ActiveFilters, Filters, SortMenu } from '@/components/commerce/Filters';
import { EndTile, ProductGrid } from '@/components/commerce/ProductGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { CampaignImage } from '@/components/media/CampaignImage';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Field';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { generatedImageNotice } from '@/content/campaign';
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
import { useStoreStatus } from '@/store/storeStatus';
import { campaignPhotos, type CampaignPhoto } from '@shared/campaign';
import { collections, getCategory, getCollection, newArrivals, products, productsByCategory, productsByCollection } from '@shared/catalog';
import { listingColumns } from '@shared/catalog/listing';
import { paths, specialCollections } from '@shared/routes';
import type { Product } from '@shared/types';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import styles from './CollectionPage.module.css';
import NotFoundPage from './NotFoundPage';

/** Banda de campaña de cada colección editorial (fotos provisionales generadas con IA). */
interface CampaignBand {
  photo: CampaignPhoto;
  layout: 'full' | 'split';
  tone: 'dark' | 'red';
  focus?: string;
  /** Foto de la pieza que remata la rejilla. */
  endPhoto: CampaignPhoto;
  endFocus?: string;
}

const campaignBands: Record<string, CampaignBand> = {
  'drop-01-ascenso': { photo: campaignPhotos.stairs, layout: 'full', tone: 'dark', focus: '58% 42%', endPhoto: campaignPhotos.crew, endFocus: '50% 40%' },
  signal: { photo: campaignPhotos.rooftop, layout: 'split', tone: 'red', focus: '50% 28%', endPhoto: campaignPhotos.detail, endFocus: '50% 50%' },
  base: { photo: campaignPhotos.cap, layout: 'split', tone: 'dark', focus: '50% 25%', endPhoto: campaignPhotos.lookTee, endFocus: '50% 30%' },
};

interface ResolvedCollection {
  title: string;
  /** Línea superior de la banda de campaña. */
  kicker?: string;
  description: string;
  products: Product[];
  variant: 'listing' | 'campaign';
  /** Presentación propia de la categoría: piezas curadas sin barra de filtros. */
  layout?: 'lab' | 'stickers';
  band?: CampaignBand;
}

function resolveCollection(handle: string): ResolvedCollection | null {
  if (handle === 'all') return { title: specialCollections.all.name, description: specialCollections.all.description, products, variant: 'listing' };
  if (handle === 'novedades')
    return { title: 'Novedades', description: specialCollections.novedades.description, products: newArrivals(), variant: 'listing' };
  const category = getCategory(handle);
  if (category)
    return {
      title: category.name,
      description: category.description,
      products: productsByCategory(category.handle),
      variant: 'listing',
      layout: category.handle === '3d' ? 'lab' : category.handle === 'stickers' ? 'stickers' : undefined,
    };
  const collection = getCollection(handle);
  if (collection)
    return {
      title: collection.name,
      kicker: collection.kicker,
      description: collection.tagline,
      products: productsByCollection(collection.handle),
      variant: 'campaign',
      band: campaignBands[collection.handle],
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

/** Con pocas piezas la barra de filtros sobra: se ve todo de un vistazo. */
const TOOLBAR_MIN = 7;

function CatalogView({ handle, collection }: { handle: string; collection: ResolvedCollection }) {
  const [params, setParams] = useSearchParams();
  const { filters, sort, page } = parseCatalogParams(params);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { lookup, status: stockStatus } = useStock();
  const serverOnline = useStoreStatus((state) => state.online || !state.loaded);

  const visible = sortProducts(applyFilters(collection.products, filters, lookup), sort, lookup);
  const shown = visible.slice(0, page * PAGE_SIZE);
  const remaining = visible.length - shown.length;
  const activeCount = activeFilterCount(filters);
  const total = collection.products.length;
  const showToolbar = !collection.layout && total >= TOOLBAR_MIN;
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
  const countLabel = total === 1 ? 'producto' : 'productos';
  const resultText =
    stockStatus === 'loading' && activeCount > 0
      ? 'Comprobando disponibilidad…'
      : activeCount > 0
        ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}`
        : '';

  const endTile =
    collection.layout === 'lab' ? (
      <EndTile variant="lab" kicker="Blind box" title="¿Cuál te toca?" text={collection.description} note="Imágenes: mockups provisionales hasta la sesión de fotos." />
    ) : (
      <EndTile
        kicker="HYPSOS"
        title="Built for the climb."
        to={handle === 'all' ? paths.collection('colecciones') : paths.collection('all')}
        cta={handle === 'all' ? 'Ver colecciones' : 'Ver toda la tienda'}
        photo={collection.band?.endPhoto}
        focus={collection.band?.endFocus}
        note={collection.band ? 'Imagen provisional · IA' : undefined}
      />
    );

  return (
    <>
      {collection.variant === 'campaign' && collection.band ? (
        <PageHeader
          variant="campaign"
          title={collection.title}
          eyebrow={`${collection.kicker} · ${total} ${total === 1 ? 'pieza' : 'piezas'}`}
          description={collection.description}
          breadcrumbs={crumbs}
          tone={collection.band.tone}
          mediaLayout={collection.band.layout}
          credit={generatedImageNotice}
          media={
            <CampaignImage
              photo={collection.band.photo}
              sizes={collection.band.layout === 'split' ? '(min-width: 1536px) 720px, (min-width: 768px) 48vw, 100vw' : '(min-width: 1536px) 1440px, 100vw'}
              focus={collection.band.focus}
              priority
              decorative
            />
          }
        />
      ) : (
        <PageHeader
          variant="listing"
          title={collection.title}
          description={collection.layout === 'lab' ? undefined : collection.description}
          breadcrumbs={crumbs}
          count={{ value: total, label: countLabel }}
          art={collection.layout === 'stickers' ? <StickerCluster /> : undefined}
        />
      )}

      {showToolbar && (
        <div className={styles.toolbar}>
          <LiquidGlass tone="light" radius="pill" bezel={12} refraction={14} className={styles.bar}>
            <button type="button" className={styles.filterButton} onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
              <SlidersHorizontal aria-hidden="true" />
              <span>
                Filtrar
                {activeCount > 0 && <span className="t-num"> ({activeCount})</span>}
              </span>
            </button>
            <span className={styles.divider} aria-hidden="true" />
            <SortMenu options={sortOptions} value={sort} onChange={(next) => update(filters, next)} className={styles.sort} />
          </LiquidGlass>
        </div>
      )}

      <div className={cn('container', styles.body, !showToolbar && styles.bodyFlush)}>
        <div className={cn(styles.refine, (activeCount > 0 || resultText) && styles.refineOn)}>
          <p className={styles.resultLine} aria-live="polite">
            {resultText}
          </p>
          <ActiveFilters products={collection.products} filters={filters} onChange={(next) => update(next)} />
        </div>
        {stockStatus === 'error' && (
          <div className={styles.notice}>
            <Alert tone="info">
              <p>
                {serverOnline
                  ? 'No hemos podido comprobar la disponibilidad. Se verificará al finalizar la compra.'
                  : 'La disponibilidad en tiempo real necesita el servidor de la tienda, que no está activo en esta versión de la web.'}
              </p>
            </Alert>
          </div>
        )}
        {visible.length > 0 ? (
          <>
            <ProductGrid
              products={shown}
              columns={listingColumns(shown.length)}
              priorityCount={4}
              headingLevel="h2"
              hideNewBadge={handle === 'novedades'}
              endTile={remaining === 0 ? endTile : undefined}
              endTileAlways={collection.layout === 'lab'}
            />
            {remaining > 0 && (
              <div className={styles.pagination}>
                <p className={styles.paginationText} aria-live="polite">
                  Mostrando {shown.length} de {visible.length}
                </p>
                <div className={styles.paginationTrack} aria-hidden="true">
                  <span style={{ transform: `scaleX(${shown.length / visible.length})` }} />
                </div>
                <Button variant="outline" onClick={loadMore}>
                  Cargar {Math.min(remaining, PAGE_SIZE)} más
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Ningún producto coincide con estos filtros</p>
            <p className="t-muted t-small">Prueba a quitar alguno o explora toda la tienda.</p>
            <Button variant="outline" onClick={() => update(emptyFilters)}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {showToolbar && (
        <Drawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filtrar"
          side="left"
          width="400px"
          footer={
            <div className={styles.drawerFooter}>
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
      )}
    </>
  );
}

/** Pegatinas troqueladas junto al título de la categoría de stickers (decorativas). */
function StickerCluster() {
  return (
    <span className={styles.stickerCluster}>
      <Star className={styles.clusterStar} />
      <Mascot className={styles.clusterMascot} />
      <Monogram className={styles.clusterMonogram} />
    </span>
  );
}

function CollectionsIndex() {
  const sorted = [...collections].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  return (
    <>
      <PageHeader
        variant="listing"
        title={specialCollections.colecciones.name}
        description={specialCollections.colecciones.description}
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Colecciones' }]}
        count={{ value: sorted.length, label: sorted.length === 1 ? 'colección' : 'colecciones' }}
      />
      <div className={cn('container', styles.collections)}>
        {sorted.map((collection, index) => (
          <Reveal key={collection.handle} index={0} className={styles.collectionBlock}>
            <CollectionCard
              collection={collection}
              headingLevel="h2"
              reverse={index % 2 === 1}
              priority={index === 0}
            />
          </Reveal>
        ))}
      </div>
    </>
  );
}
