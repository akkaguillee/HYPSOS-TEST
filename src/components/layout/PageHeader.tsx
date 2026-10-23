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
  /**
   * - `default`: cabecera de página de contenido.
   * - `listing`: cabecera compacta de listado (migas, H1 condensado con el recuento y una línea
   *   de descripción) para que la primera fila de productos quede sobre el pliegue.
   * - `campaign`: banda de campaña con foto y titular comprimido (colecciones).
   */
  variant?: 'default' | 'listing' | 'campaign';
  /** Recuento junto al H1 (listing): `{ value: 20, label: 'productos' }`. */
  count?: { value: number; label: string };
  /** Ilustración decorativa a la derecha del título (listing). */
  art?: ReactNode;
  /** Foto de la banda (campaign). */
  media?: ReactNode;
  /** `full`: foto a sangre bajo el texto. `split`: texto sobre color y foto al lado (fotos verticales). */
  mediaLayout?: 'full' | 'split';
  /** Tema de la banda de campaña. */
  tone?: 'dark' | 'red';
  /** Nota de procedencia de la foto (p. ej. imagen provisional generada con IA). */
  credit?: string;
  children?: ReactNode;
}

export function PageHeader(props: PageHeaderProps) {
  const { variant = 'default' } = props;
  if (variant === 'listing') return <ListingHeader {...props} />;
  if (variant === 'campaign') return <CampaignHeader {...props} />;
  const { title, eyebrow, description, breadcrumbs, aside, children } = props;
  return (
    <header className={styles.header}>
      <div className={cn('container', styles.inner)}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={styles.titles}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <SplitHeadline as="h1" trigger="mount" className={cn('t-h1', styles.title)}>
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

function Count({ count }: { count: NonNullable<PageHeaderProps['count']> }) {
  return (
    <p className={styles.count}>
      <span aria-hidden="true">({count.value})</span>
      <span className="visually-hidden">
        {count.value} {count.label}
      </span>
    </p>
  );
}

function ListingHeader({ title, description, breadcrumbs, count, art, children }: PageHeaderProps) {
  return (
    <header className={cn(styles.header, styles.listing)}>
      <div className={cn('container', styles.listingInner)}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={styles.listingRow}>
          <div className={styles.listingTitles}>
            <SplitHeadline as="h1" trigger="mount" className={styles.listingTitle}>
              {title}
            </SplitHeadline>
            {count && <Count count={count} />}
          </div>
          {description && <p className={styles.listingDescription}>{description}</p>}
          {art && (
            <div className={styles.art} aria-hidden="true">
              {art}
            </div>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}

function CampaignHeader({ title, eyebrow, description, breadcrumbs, aside, media, mediaLayout = 'full', tone = 'dark', credit, children }: PageHeaderProps) {
  return (
    <header className={cn(styles.header, styles.campaign)}>
      <div className={cn('container', styles.campaignInner)}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={styles.band} data-theme={tone} data-layout={mediaLayout}>
          {media && (
            <div className={styles.bandMedia}>
              {media}
              <span className={styles.scrim} aria-hidden="true" />
            </div>
          )}
          <div className={styles.bandCopy}>
            {eyebrow && <p className={styles.bandEyebrow}>{eyebrow}</p>}
            <SplitHeadline as="h1" trigger="mount" className={styles.bandTitle}>
              {title}
            </SplitHeadline>
            {(description || aside || credit) && (
              <div className={styles.bandFoot}>
                {description && <p className={styles.bandDescription}>{description}</p>}
                {(aside || credit) && (
                  <div className={styles.bandAside}>
                    {aside}
                    {credit && <p className={styles.credit}>{credit}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
