import { ProductMedia } from '@/components/commerce/ProductMedia';
import { ButtonLink, IconButton } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useUi } from '@/store/ui';
import { searchProducts } from '@shared/catalog';
import { paths } from '@shared/routes';
import { Search, X } from 'lucide-react';
import { track } from '@/lib/analytics';
import { useDeferredValue, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import styles from './SearchPanel.module.css';

const suggestions = ['Sudadera', 'Camiseta', 'Monogram', 'Signal', 'Gorra', 'Stickers'];

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
  const listId = useId();
  const [active, setActive] = useState(-1);
  useScrollLock(open);
  useFocusTrap(panelRef, open, close, inputRef);

  const results = deferredQuery.trim().length >= 2 ? searchProducts(deferredQuery) : [];
  const visible = results.slice(0, 6);
  const searchUrl = `${paths.search}?q=${encodeURIComponent(query.trim())}`;

  // La opción activa se reinicia al cambiar la búsqueda.
  const [lastQuery, setLastQuery] = useState(deferredQuery);
  if (lastQuery !== deferredQuery) {
    setLastQuery(deferredQuery);
    setActive(-1);
  }

  // Registro de búsquedas (con consentimiento) cuando el usuario deja de escribir.
  useEffect(() => {
    const term = deferredQuery.trim();
    if (term.length < 2) return;
    const timer = window.setTimeout(() => track('search', { search_term: term.toLowerCase(), results: results.length }), 800);
    return () => window.clearTimeout(timer);
  }, [deferredQuery, results.length]);

  const openProduct = (handle: string) => {
    close();
    navigate(paths.product(handle), { viewTransition: true });
  };

  const goToResults = () => {
    if (active >= 0 && visible[active]) return openProduct(visible[active].handle);
    if (!query.trim()) return;
    close();
    navigate(searchUrl, { viewTransition: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visible.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % visible.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current <= 0 ? visible.length - 1 : current - 1));
    }
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
                role="combobox"
                aria-expanded={visible.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                onKeyDown={onKeyDown}
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

          <ul id={listId} role="listbox" aria-label="Sugerencias" className={styles.results} hidden={visible.length === 0}>
            {visible.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={styles.result}
                data-active={index === active}
                onPointerMove={() => active !== index && setActive(index)}
                onClick={() => openProduct(product.handle)}
              >
                <span className={styles.resultMedia}>
                  <ProductMedia product={product} media={product.media[0]} decorative sizes="200px" />
                </span>
                <span className={styles.resultName}>{product.name}</span>
                <Price amount={product.price} className="t-muted" />
              </li>
            ))}
          </ul>
          {results.length > 0 && (
            <>
              <div className={styles.footer}>
                <ButtonLink to={searchUrl} variant="outline" onClick={close}>
                  Ver los {results.length} resultados
                </ButtonLink>
                <span className="t-micro">↑ ↓ para elegir · Intro para abrir</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
