import { announcements, demoNotice } from '@/content/campaign';
import { store } from '@shared/config';
import { Star } from '@/components/brand/BrandVector';
import { Fragment } from 'react';
import styles from './AnnouncementBar.module.css';

/**
 * Banda superior en marquesina: frases del Manual de Marca y, mientras el catálogo sea de
 * demostración, el aviso de datos no reales en cada vuelta. Se detiene al pasar el cursor o al
 * enfocar, y queda estática con movimiento reducido. Los lectores de pantalla leen el texto una vez.
 */
export function AnnouncementBar() {
  const items = store.demoCatalog ? [demoNotice.long, ...announcements] : announcements;
  const run = (hidden: boolean) => (
    <span className={styles.run} aria-hidden={hidden || undefined}>
      {items.map((item, index) => (
        <Fragment key={index}>
          <span className={styles.item} data-notice={store.demoCatalog && index === 0 ? 'true' : undefined}>
            {item}
          </span>
          <Star className={styles.mark} />
        </Fragment>
      ))}
    </span>
  );
  return (
    <div className={styles.bar} role="region" aria-label="Avisos de la tienda">
      <p className="visually-hidden">{items.join(' · ')}</p>
      <div className={styles.track} aria-hidden="true">
        {run(true)}
        {run(true)}
      </div>
    </div>
  );
}
