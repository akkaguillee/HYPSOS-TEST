import { SortMenu } from '@/components/commerce/Filters';
import { EndTile, ProductGrid } from '@/components/commerce/ProductGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { sortProducts } from '@/lib/catalog-filters';
import { useStock } from '@/store/inventory';
import { featuredProducts, searchProducts } from '@shared/catalog';
import { listingColumns } from '@shared/catalog/listing';
import { paths } from '@shared/routes';
import { Search, X } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import styles from './SearchPage.module.css';

/** Mismos términos que el buscador superpuesto. */
const suggestions = ['Sudadera', 'Camiseta', 'Monogram', 'Signal', 'Gorra', 'Stickers'];

const searchSortOptions = [
  { id: 'relevancia', label: 'Relevancia' },
  { id: 'novedades', label: 'Novedades' },
  { id: 'precio-asc', label: 'Precio: menor a mayor' },
  { id: 'precio-desc', label: 'Precio: mayor a menor' },
] as const;

type SearchSort = (typeof searchSortOptions)[number]['id'];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const sortParam = params.get('orden');
  const sort: SearchSort = searchSortOptions.some((option) => option.id === sortParam) ? (sortParam as SearchSort) : 'relevancia';
  const [draft, setDraft] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const { lookup } = useStock();
  // Si la URL cambia (buscador superpuesto, atrás/adelante), el campo la refleja.
  if (lastQuery !== query) {
    setLastQuery(query);
    setDraft(query);
  }

  const found = query ? searchProducts(query) : [];
  const results = sort === 'relevancia' ? found : sortProducts(found, sort, lookup);
  const popular = featuredProducts(4);
  useDocumentMeta(paths.search, { title: query ? `Buscar “${query}” | HYPSOS` : 'Buscar | HYPSOS' });

  const search = (term: string, nextSort: SearchSort = sort) => {
    const next = new URLSearchParams();
    if (term.trim()) next.set('q', term.trim());
    if (term.trim() && nextSort !== 'relevancia') next.set('orden', nextSort);
    setParams(next);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    search(draft);
    inputRef.current?.blur();
  };
  const clear = () => {
    setDraft('');
    inputRef.current?.focus();
  };

  const endTile = <EndTile kicker="HYPSOS" title="Built for the climb." to={paths.collection('all')} cta="Ver toda la tienda" />;

  return (
    <>
      <PageHeader
        variant="listing"
        title="Buscar"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Buscar' }]}
      >
        <form role="search" onSubmit={submit} className={styles.form}>
          <Search aria-hidden="true" className={styles.icon} />
          <label htmlFor="search-page-input" className="visually-hidden">
            Buscar productos
          </label>
          <input
            ref={inputRef}
            id="search-page-input"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="¿Qué buscas?"
            className={styles.input}
            aria-describedby={statusId}
            autoComplete="off"
            enterKeyHint="search"
          />
          {draft && (
            <button type="button" className={styles.clear} onClick={clear} aria-label="Borrar búsqueda">
              <X aria-hidden="true" />
            </button>
          )}
        </form>
        <div className={styles.meta}>
          <p id={statusId} className={styles.status} aria-live="polite">
            {query
              ? results.length > 0
                ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para «${query}»`
                : `Sin resultados para «${query}»`
              : 'Pulsa Intro para buscar'}
          </p>
          {results.length > 1 && <SortMenu options={searchSortOptions} value={sort} onChange={(next) => search(query, next)} />}
        </div>
        {!query && (
          <div className={styles.suggestions}>
            <span className={styles.suggestionsLabel}>Populares</span>
            {suggestions.map((term) => (
              <button
                key={term}
                type="button"
                className={styles.chip}
                onClick={() => {
                  setDraft(term);
                  search(term);
                }}
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </PageHeader>
      <div className={`container ${styles.body}`}>
        {query && results.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nada por aquí</p>
            <p className="t-muted">Revisa la ortografía o prueba con términos más generales.</p>
          </div>
        )}
        {results.length > 0 ? (
          <ProductGrid products={results} columns={listingColumns(results.length)} headingLevel="h2" endTile={endTile} />
        ) : (
          <section aria-labelledby="search-popular">
            <h2 id="search-popular" className={styles.popularTitle}>
              Lo más buscado
            </h2>
            <ProductGrid products={popular} columns={listingColumns(popular.length)} headingLevel="h3" />
          </section>
        )}
      </div>
    </>
  );
}
