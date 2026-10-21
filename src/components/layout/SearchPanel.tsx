import { ProductMedia } from '@/components/commerce/ProductMedia';
import { ButtonLink, IconButton } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useUi } from '@/store/ui';
import { searchProducts } from '@shared/catalog';
import { paths } from '@shared/routes';
import { Search, X } from 'lucide-react';
import { useDeferredValue, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import styles from './SearchPanel.module.css';

const suggestions = ['Sudadera', 'Camiseta', 'Cromo', 'Signal', 'Gorra', 'Stickers'];

export function SearchPanel() {
  const open = useUi((state) => state.panel === 'search');
  const close = useUi((state) => state.closePanel);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const titleId = useId();
  const statusId = useId();
  useScrollLock(open);
  useFocusTrap(panelRef, open, close, inputRef);

  const results = deferredQuery.trim().length >= 2 ? searchProducts(deferredQuery) : [];
  const searchUrl = `${paths.search}?q=${encodeURIComponent(query.trim())}`;

  const goToResults = () => {
    if (!query.trim()) return;
    close();
    navigate(searchUrl, { viewTransition: true });
  };

  return (
    <div className={styles.root} data-open={open} inert={!open}>
      <div className={styles.overlay} onClick={close} aria-hidden="true" />
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={`container ${styles.inner}`}>
          <h2 id={titleId} className="visually-hidden">
            Buscar productos
          </h2>
          <div>
            <form
              role="search"
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                goToResults();
              }}
            >
              <Search aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                className={styles.input}
                placeholder="¿Qué buscas?"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar productos"
                aria-describedby={statusId}
                autoComplete="off"
                enterKeyHint="search"
              />
              <IconButton label="Cerrar búsqueda" onClick={close}>
                <X aria-hidden="true" />
              </IconButton>
            </form>
            {query.trim().length < 2 && (
              <div className={styles.suggestions}>
                <span className="t-micro" style={{ alignSelf: 'center', marginRight: 8 }}>
                  Populares
                </span>
                {suggestions.map((term) => (
                  <button key={term} type="button" className={styles.chip} onClick={() => setQuery(term)}>
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p id={statusId} className="t-micro" aria-live="polite">
            {deferredQuery.trim().length >= 2 &&
              (results.length === 0
                ? `Sin resultados para “${deferredQuery.trim()}”`
                : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`)}
          </p>

          {results.length > 0 && (
            <>
              <ul role="list" className={styles.results}>
                {results.slice(0, 6).map((product) => (
                  <li key={product.id}>
                    <Link to={paths.product(product.handle)} className={styles.result} onClick={close} viewTransition>
                      <span className={styles.resultMedia}>
                        <ProductMedia product={product} media={product.media[0]} compact decorative sizes="200px" />
                      </span>
                      <span className={styles.resultName}>{product.name}</span>
                      <Price amount={product.price} className="t-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={styles.footer}>
                <ButtonLink to={searchUrl} variant="outline" onClick={close}>
                  Ver todos los resultados
                </ButtonLink>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
