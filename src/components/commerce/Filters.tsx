import { activeFilterCount, facetOptions, priceRanges, type FilterState } from '@/lib/catalog-filters';
import type { Product } from '@shared/types';
import { Check, X } from 'lucide-react';
import { useId } from 'react';
import styles from './Filters.module.css';

interface FiltersProps {
  products: Product[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Panel de filtros. Cada opción muestra cuántos productos quedarían al aplicarla. */
export function Filters({ products, filters, onChange }: FiltersProps) {
  const facets = facetOptions(products);
  const id = useId();
  const countWhere = (predicate: (product: Product) => boolean) => products.filter(predicate).length;

  return (
    <div className={styles.panel}>
      {facets.categories.length > 1 && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>
            Categoría
          </legend>
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

      {facets.sizes.length > 1 && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>
            Talla
          </legend>
          <div className={styles.chips}>
            {facets.sizes.map((size) => (
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
        </fieldset>
      )}

      {facets.colors.length > 1 && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>
            Color
          </legend>
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

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>
          Precio
        </legend>
        <div className={styles.options}>
          {priceRanges.map((range) => {
            const count = countWhere((product) => product.price >= range.min && product.price < range.max);
            if (count === 0) return null;
            return (
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
                <span className={styles.count}>{count}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

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
