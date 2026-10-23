import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';
import styles from './PageIntro.module.css';

interface PageIntroProps {
  title: string;
  breadcrumbs?: Crumb[];
  /** Dato técnico a la derecha del titular (recuento, email, fecha). */
  aside?: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Cabecera compacta de las páginas de servicio (carrito, checkout, cuenta, ayuda y legal):
 * ruta en monoespaciada y titular condensado. Sin etiqueta redundante ni filete inferior.
 */
export function PageIntro({ title, breadcrumbs, aside, lead, children, className }: PageIntroProps) {
  return (
    <header className={cn(styles.intro, className)}>
      <div className={cn('container', styles.inner)}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={styles.head}>
          <SplitHeadline as="h1" trigger="mount" className={cn('t-h1', styles.title)}>
            {title}
          </SplitHeadline>
          {aside && <div className={styles.aside}>{aside}</div>}
        </div>
        {lead && <div className={styles.lead}>{lead}</div>}
        {children}
      </div>
    </header>
  );
}
