import type { CSSProperties, ReactNode } from 'react';
import styles from './Marquee.module.css';

interface MarqueeProps {
  children: ReactNode;
  /** Segundos por vuelta. */
  duration?: number;
  className?: string;
  label?: string;
}

/** Cinta de texto continua en CSS puro. La copia duplicada se oculta a lectores de pantalla. */
export function Marquee({ children, duration = 38, className, label }: MarqueeProps) {
  return (
    <div className={`${styles.marquee} ${className ?? ''}`} style={{ '--marquee-duration': `${duration}s` } as CSSProperties} aria-label={label} role={label ? 'region' : undefined}>
      <div className={styles.track}>{children}</div>
      <div className={styles.track} aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
