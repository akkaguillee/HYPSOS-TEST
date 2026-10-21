import { cn } from '@/lib/cn';
import { getStock, isColorAvailable } from '@shared/catalog';
import type { Product } from '@shared/types';
import type { ReactNode, Ref } from 'react';
import styles from './VariantPicker.module.css';

export function ColorPicker({ product, value, onChange }: { product: Product; value: string; onChange: (colorId: string) => void }) {
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
          const available = isColorAvailable(product, color.id);
          return (
            <label key={color.id} className={styles.option} title={`${color.name}${available ? '' : ' (agotado)'}`}>
              <input
                type="radio"
                name={`color-${product.id}`}
                value={color.id}
                checked={value === color.id}
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
  error?: string;
  action?: ReactNode;
  groupRef?: Ref<HTMLFieldSetElement>;
  errorId?: string;
}

export function SizePicker({ product, colorId, value, onChange, error, action, groupRef, errorId }: SizePickerProps) {
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
          const stock = getStock(product, colorId, size);
          const soldOut = stock <= 0;
          return (
            <label key={size} className={styles.option}>
              <input
                type="radio"
                name={`size-${product.id}`}
                value={size}
                checked={value === size}
                disabled={soldOut}
                onChange={() => onChange(size)}
                aria-label={`Talla ${size}${soldOut ? ', agotada' : stock <= 3 ? `, últimas ${stock} unidades` : ''}`}
              />
              <span className={styles.size}>{size}</span>
              {!soldOut && stock <= 3 && <span className={styles.lowStock} aria-hidden="true" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
