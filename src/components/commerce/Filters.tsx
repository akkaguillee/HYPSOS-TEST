import { activeFilterCount, facetOptions, priceRanges, type FilterState } from '@/lib/catalog-filters';
import { cn } from '@/lib/cn';
import type { Product } from '@shared/types';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './Filters.module.css';

interface FiltersProps {
  products: Product[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Tallas de calcetines (rangos numéricos): van en su propio subgrupo. */
const isSockSize = (size: string) => /^\d/.test(size);

/**
 * Panel de filtros. Cada opción muestra cuántos productos quedarían al aplicarla y solo se
 * muestran las facetas con al menos dos opciones (o con alguna ya elegida, para poder quitarla).
 */
export function Filters({ products, filters, onChange }: FiltersProps) {
  const facets = facetOptions(products);
  const id = useId();
  const countWhere = (predicate: (product: Product) => boolean) => products.filter(predicate).length;

  // «Única» no filtra nada: es la talla de los accesorios.
  const sizes = facets.sizes.filter((size) => size !== 'Única');
  const sizeGroups = [
    { id: 'ropa', label: 'Ropa', sizes: sizes.filter((size) => !isSockSize(size)) },
    { id: 'calcetines', label: 'Calcetines', sizes: sizes.filter(isSockSize) },
  ].filter((group) => group.sizes.length > 0);
  const prices = priceRanges
    .map((range) => ({ ...range, count: countWhere((product) => product.price >= range.min && product.price < range.max) }))
    .filter((range) => range.count > 0 || filters.prices.includes(range.id));

  const showCategories = facets.categories.length > 1 || filters.categories.length > 0;
  const showSizes = sizes.length > 1 || filters.sizes.length > 0;
  const showColors = facets.colors.length > 1 || filters.colors.length > 0;
  const showPrices = prices.length > 1 || filters.prices.length > 0;

  return (
    <div className={styles.panel}>
      {showCategories && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Categoría</legend>
          <div className={styles.options}>
            {facets.categories.map((category) => (
              <button
                key={category.handle}
                type="button"
                className={styles.option}
                aria-pressed={filters.categories.includes(category.handle)}
                onClick={() => onChange({ ...filters, categories: toggle(filters.categories, category.handle) })}
              >
                <span className={styles.box}>
                  <Check aria-hidden="true" />
                </span>
                {category.name}
                <span className={styles.count}>{countWhere((product) => product.category === category.handle)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {showSizes && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Talla</legend>
          <div className={styles.sizeGroups}>
            {sizeGroups.map((group) => (
              <div key={group.id} className={styles.sizeGroup}>
                {sizeGroups.length > 1 && <p className={styles.subTitle}>{group.label}</p>}
                <div className={styles.chips} data-wide={group.id === 'calcetines' || undefined}>
                  {group.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={styles.chip}
                      aria-pressed={filters.sizes.includes(size)}
                      aria-label={`Talla ${size}`}
                      onClick={() => onChange({ ...filters, sizes: toggle(filters.sizes, size) })}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {showColors && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Color</legend>
          <div className={styles.options}>
            {facets.colors.map((color) => (
              <button
                key={color.id}
                type="button"
                className={styles.option}
                aria-pressed={filters.colors.includes(color.id)}
                onClick={() => onChange({ ...filters, colors: toggle(filters.colors, color.id) })}
              >
                <span className={styles.swatch} style={{ background: color.hex }} aria-hidden="true" />
                {color.name}
                <span className={styles.count}>{countWhere((product) => product.colors.some((option) => option.id === color.id))}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {showPrices && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Precio</legend>
          <div className={styles.options}>
            {prices.map((range) => (
              <button
                key={range.id}
                type="button"
                className={styles.option}
                aria-pressed={filters.prices.includes(range.id)}
                onClick={() => onChange({ ...filters, prices: toggle(filters.prices, range.id) })}
              >
                <span className={styles.box}>
                  <Check aria-hidden="true" />
                </span>
                {range.label}
                <span className={styles.count}>{range.count}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        role="switch"
        id={`${id}-stock`}
        className={styles.toggle}
        aria-checked={filters.inStock}
        onClick={() => onChange({ ...filters, inStock: !filters.inStock })}
      >
        <span className={styles.groupTitle}>Solo disponibles</span>
        <span className={styles.switch} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Chips de filtros activos con opción de quitar cada uno o todos. */
export function ActiveFilters({ products, filters, onChange }: FiltersProps) {
  const facets = facetOptions(products);
  if (activeFilterCount(filters) === 0) return null;

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.categories.map((handle) => ({
      key: `c-${handle}`,
      label: facets.categories.find((category) => category.handle === handle)?.name ?? handle,
      remove: () => onChange({ ...filters, categories: filters.categories.filter((value) => value !== handle) }),
    })),
    ...filters.sizes.map((size) => ({
      key: `s-${size}`,
      label: `Talla ${size}`,
      remove: () => onChange({ ...filters, sizes: filters.sizes.filter((value) => value !== size) }),
    })),
    ...filters.colors.map((colorId) => ({
      key: `col-${colorId}`,
      label: facets.colors.find((color) => color.id === colorId)?.name ?? colorId,
      remove: () => onChange({ ...filters, colors: filters.colors.filter((value) => value !== colorId) }),
    })),
    ...filters.prices.map((priceId) => ({
      key: `p-${priceId}`,
      label: priceRanges.find((range) => range.id === priceId)?.label ?? priceId,
      remove: () => onChange({ ...filters, prices: filters.prices.filter((value) => value !== priceId) }),
    })),
    ...(filters.inStock ? [{ key: 'stock', label: 'Solo disponibles', remove: () => onChange({ ...filters, inStock: false }) }] : []),
  ];

  return (
    <div className={styles.active} aria-label="Filtros activos" role="group">
      {chips.map((chip) => (
        <button key={chip.key} type="button" className={styles.activeChip} onClick={chip.remove} aria-label={`Quitar filtro ${chip.label}`}>
          {chip.label}
          <X aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        className={styles.clear}
        onClick={() => onChange({ sizes: [], colors: [], prices: [], categories: [], inStock: false })}
      >
        Limpiar todo
      </button>
    </div>
  );
}

interface SortMenuProps<T extends string> {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Selector de orden: botón «Ordenar: Destacados ▾» que abre una lista (listbox) con teclado
 * completo (flechas, Inicio/Fin, Intro, Escape) y cierre al pulsar fuera.
 */
export function SortMenu<T extends string>({ options, value, onChange, className }: SortMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const current = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const [active, setActive] = useState(current);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const show = () => {
    setActive(current);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option && option.id !== value) onChange(option.id);
    close();
  };

  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show();
    }
  };

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => last,
    };
    if (moves[event.key]) {
      event.preventDefault();
      setActive(moves[event.key]());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div ref={rootRef} className={cn(styles.sort, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.sortButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onButtonKey}
      >
        <span className={styles.sortLabel}>
          Ordenar<span className={styles.sortExtra}>:</span>
        </span>{' '}
        <span className={cn(styles.sortValue, styles.sortExtra)}>{options[current]?.label}</span>
        <ChevronDown aria-hidden="true" className={styles.sortChevron} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Ordenar por"
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          className={styles.sortList}
          onKeyDown={onListKey}
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.id === value}
              data-active={index === active || undefined}
              className={styles.sortOption}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.label}
              <Check aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
