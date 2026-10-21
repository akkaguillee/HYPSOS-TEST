import { cn } from '@/lib/cn';
import { getStock, isColorAvailable } from '@shared/catalog';
import type { Product, StockLookup } from '@shared/types';
import type { ReactNode, Ref } from 'react';
import styles from './VariantPicker.module.css';

interface ColorPickerProps {
  product: Product;
  value: string;
  onChange: (colorId: string) => void;
  stock: StockLookup;
  /** Hasta que no se conoce el stock real no se bloquea ningún color. */
  stockKnown: boolean;
}

export function ColorPicker({ product, value, onChange, stock, stockKnown }: ColorPickerProps) {
  const current = product.colors.find((color) => color.id === value);
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        <span>
          Color: <span className={styles.legendValue}>{current?.name}</span>
        </span>
      </legend>
      <div className={styles.options}>
        {product.colors.map((color) => {
          const available = !stockKnown || isColorAvailable(product, color.id, stock);
          return (
            <label key={color.id} className={cn(styles.option, !available && styles.unavailable)} title={`${color.name}${available ? '' : ' (agotado)'}`}>
              <input
                type="radio"
                name={`color-${product.id}`}
                value={color.id}
                checked={value === color.id}
                disabled={!available}
                onChange={() => onChange(color.id)}
                aria-label={`${color.name}${available ? '' : ', agotado'}`}
              />
              <span className={styles.swatch}>
                <span style={{ background: color.hex }} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface SizePickerProps {
  product: Product;
  colorId: string;
  value: string | null;
  onChange: (size: string) => void;
  stock: StockLookup;
  stockKnown: boolean;
  error?: string;
  action?: ReactNode;
  groupRef?: Ref<HTMLFieldSetElement>;
  errorId?: string;
}

export function SizePicker({ product, colorId, value, onChange, stock, stockKnown, error, action, groupRef, errorId }: SizePickerProps) {
  return (
    <fieldset ref={groupRef} className={cn(styles.group, error && styles.invalid)} aria-describedby={error ? errorId : undefined} tabIndex={-1}>
      <legend className={styles.legend}>
        <span>
          Talla{value && <span className={styles.legendValue}>: {value}</span>}
        </span>
        {action}
      </legend>
      <div className={styles.sizes}>
        {product.sizes.map((size) => {
          const units = getStock(product, colorId, size, stock);
          const soldOut = stockKnown && units <= 0;
          const low = stockKnown && !soldOut && units <= 3;
          return (
            <label key={size} className={styles.option}>
              <input
                type="radio"
                name={`size-${product.id}`}
                value={size}
                checked={value === size}
                disabled={soldOut}
                onChange={() => onChange(size)}
                aria-label={`Talla ${size}${soldOut ? ', agotada' : low ? `, últimas ${units} unidades` : ''}`}
              />
              <span className={styles.size}>{size}</span>
              {low && <span className={styles.lowStock} aria-hidden="true" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
