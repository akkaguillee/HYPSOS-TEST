import { freeShippingThreshold } from '@shared/config';
import { formatPrice, remainingForFreeShipping } from '@shared/pricing';
import styles from './Cart.module.css';

/** Progreso hacia el envío gratuito. Solo aparece si la tienda tiene ese umbral configurado. */
export function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const threshold = freeShippingThreshold();
  if (threshold === null) return null;
  const remaining = remainingForFreeShipping(subtotal, threshold);
  const ratio = Math.min(1, subtotal / threshold);
  return (
    <div className={styles.shipping}>
      <p aria-live="polite">
        {remaining > 0 ? (
          <>
            Te faltan <strong className="t-num">{formatPrice(remaining)}</strong> para el envío gratuito.
          </>
        ) : (
          <strong>Tienes envío gratuito.</strong>
        )}
      </p>
      <div
        className={styles.shippingTrack}
        role="progressbar"
        aria-label="Progreso hacia el envío gratuito"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div className={styles.shippingBar} style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  );
}
