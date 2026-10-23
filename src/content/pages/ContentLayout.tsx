import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';
import styles from './Content.module.css';

interface ContentLayoutProps {
  /** Columna lateral (índice, datos de contacto). En escritorio queda fija al hacer scroll. */
  rail?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Maqueta de las páginas de ayuda y legales: índice a la izquierda y columna de lectura. */
export function ContentLayout({ rail, children, className }: ContentLayoutProps) {
  return (
    <div className={cn('container', styles.layout, Boolean(rail) && styles.withRail, className)}>
      {rail && <div className={styles.rail}>{rail}</div>}
      <div className={styles.main}>{children}</div>
    </div>
  );
}

/** Índice de la página: píldoras desplazables en móvil, lista numerada en escritorio. */
export function PageToc({ items, label = 'En esta página' }: { items: { id: string; label: string }[]; label?: string }) {
  return (
    <nav aria-label={label} className={styles.toc}>
      <p className={styles.tocTitle}>{label}</p>
      <ol role="list" className={styles.tocList}>
        {items.map((item, index) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={styles.tocLink}>
              <span className={styles.tocIndex} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
