import { Minus, Plus } from 'lucide-react';
import styles from './QuantityStepper.module.css';

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
}

export function QuantityStepper({ value, max, onChange, label, min = 1 }: QuantityStepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={`Cantidad de ${label}`}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Quitar una unidad de ${label}`}
      >
        <Minus aria-hidden="true" />
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Añadir una unidad de ${label}`}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
