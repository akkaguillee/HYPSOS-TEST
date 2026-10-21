import { ProductGrid } from '@/components/commerce/ProductGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { featuredProducts, searchProducts } from '@shared/catalog';
import { paths } from '@shared/routes';
import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import styles from './SearchPage.module.css';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const [draft, setDraft] = useState(query);
  const results = query ? searchProducts(query) : [];
  useDocumentMeta(paths.search, { title: query ? `Buscar “${query}” | HYPSOS` : 'Buscar | HYPSOS' });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  };

  return (
    <>
      <PageHeader
        title={query ? `“${query}”` : 'Buscar'}
        eyebrow="Búsqueda"
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Buscar' }]}
        aside={query ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}` : undefined}
      >
        <form role="search" onSubmit={submit} className={styles.form}>
          <label htmlFor="search-page-input" className="visually-hidden">
            Buscar productos
          </label>
          <input
            id="search-page-input"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Sudadera, camiseta, mascot…"
            className={styles.input}
          />
          <Button type="submit" aria-label="Buscar">
            <Search aria-hidden="true" size={18} />
          </Button>
        </form>
      </PageHeader>
      <div className={`container ${styles.body}`}>
        {query && results.length === 0 && (
          <div className={styles.empty}>
            <p className="t-h3">No hemos encontrado nada para “{query}”</p>
            <p className="t-muted">Revisa la ortografía o prueba con términos más generales.</p>
          </div>
        )}
        {results.length > 0 ? (
          <ProductGrid products={results} headingLevel="h2" />
        ) : (
          <>
            <h2 className={`eyebrow ${styles.suggestionsTitle}`}>
              Lo más buscado
            </h2>
            <ProductGrid products={featuredProducts(4)} headingLevel="h3" />
          </>
        )}
      </div>
    </>
  );
}
