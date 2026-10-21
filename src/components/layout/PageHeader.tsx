import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  aside?: ReactNode;
  variant?: 'default' | 'campaign';
  children?: ReactNode;
}

export function PageHeader({ title, eyebrow, description, breadcrumbs, aside, variant = 'default', children }: PageHeaderProps) {
  return (
    <header className={cn(styles.header, variant === 'campaign' && styles.campaign)}>
      <div className={cn('container', styles.inner)}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={styles.titles}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <SplitHeadline as="h1" trigger="mount" className={cn(variant === 'campaign' ? 't-display' : 't-h1', styles.title)}>
            {title}
          </SplitHeadline>
        </div>
        {(description || aside) && (
          <div className={styles.row}>
            {description && <div className={cn('t-lead', styles.description)}>{description}</div>}
            {aside && <div className={styles.aside}>{aside}</div>}
          </div>
        )}
        {children}
      </div>
    </header>
  );
}
