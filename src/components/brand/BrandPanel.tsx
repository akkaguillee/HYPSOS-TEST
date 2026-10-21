import { cn } from '@/lib/cn';
import type { CSSProperties } from 'react';
import { Mascot, Monogram, Star, Wordmark } from './BrandVector';
import styles from './BrandPanel.module.css';

export type PanelTone = 'red' | 'black' | 'graphite' | 'light';
export type PanelMark = 'monogram' | 'star' | 'mascot' | 'wordmark';

interface BrandPanelProps {
  tone: PanelTone;
  mark: PanelMark;
  /** Estrella secundaria con giro lento en una esquina. */
  accent?: boolean;
  className?: string;
  style?: CSSProperties;
}

const marks: Record<PanelMark, (className: string) => React.ReactNode> = {
  monogram: (className) => <Monogram className={className} />,
  star: (className) => <Star className={className} />,
  mascot: (className) => <Mascot className={className} />,
  wordmark: (className) => <Wordmark className={className} />,
};

/**
 * Plano de color sólido con una marca oficial de HYPSOS (sin degradados ni efectos metálicos).
 * Decorativo: el texto que lo acompaña vive fuera. Los contenedores pueden animar la marca con
 * `[data-brand-mark]` y la estrella con `[data-brand-accent]` (solo transform/opacity).
 */
export function BrandPanel({ tone, mark, accent = false, className, style }: BrandPanelProps) {
  return (
    <div className={cn(styles.panel, className)} data-tone={tone} data-mark={mark} style={style} aria-hidden="true">
      <div className={styles.mark} data-brand-mark="">
        {marks[mark](styles.glyph)}
      </div>
      {accent && (
        <div className={styles.accent} data-brand-accent="">
          <Star className={styles.accentGlyph} />
        </div>
      )}
    </div>
  );
}
