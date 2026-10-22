import { ProductMedia } from '@/components/commerce/ProductMedia';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { shopNav } from '@/content/navigation';
import { productsByCategory, productsByCollection, products } from '@shared/catalog';
import { paths } from '@shared/routes';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import styles from './MegaMenu.module.css';

interface MegaMenuProps {
  id: string;
  open: boolean;
  onNavigate: () => void;
  onMouseEnter: () => void;
}

const FEATURED_COLLECTION = 'drop-01-ascenso';

export function MegaMenu({ id, open, onNavigate, onMouseEnter }: MegaMenuProps) {
  const featured = productsByCollection(FEATURED_COLLECTION)[0];
  let index = 0;
  const item = () => ({ '--i': index++ }) as CSSProperties;

  return (
    <LiquidGlass id={id} radius={20} bezel={18} refraction={22} className={styles.panel} data-open={open} inert={!open} onMouseEnter={onMouseEnter}>
      <div className={styles.grid}>
        <div>
          <p className={`eyebrow ${styles.columnTitle}`}>Ropa</p>
          <ul role="list" className={styles.list}>
            {shopNav.apparel.map((category) => (
              <li key={category.handle} className={styles.item} style={item()}>
                <Link to={paths.collection(category.handle)} className={styles.link} onClick={onNavigate} viewTransition>
                  {category.name}
                  <span className={styles.count}>{productsByCategory(category.handle).length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={`eyebrow ${styles.columnTitle}`}>Más</p>
          <ul role="list" className={styles.list}>
            {shopNav.more.map((category) => (
              <li key={category.handle} className={styles.item} style={item()}>
                <Link to={paths.collection(category.handle)} className={styles.link} onClick={onNavigate} viewTransition>
                  {category.name}
                  <span className={styles.count}>{productsByCategory(category.handle).length}</span>
                </Link>
              </li>
            ))}
            <li className={styles.item} style={item()}>
              <Link to={paths.collection('all')} className={styles.link} onClick={onNavigate} viewTransition>
                Ver todo
                <span className={styles.count}>{products.length}</span>
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className={`eyebrow ${styles.columnTitle}`}>Colecciones</p>
          <ul role="list" className={styles.list}>
            {shopNav.collections.map((collection) => (
              <li key={collection.handle} className={styles.item} style={item()}>
                <Link to={paths.collection(collection.handle)} className={styles.link} onClick={onNavigate} viewTransition>
                  {collection.name}
                  <span className={styles.count}>{productsByCollection(collection.handle).length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <Link to={paths.collection(FEATURED_COLLECTION)} className={styles.feature} data-theme="light" onClick={onNavigate} viewTransition>
          {featured && (
            <span className={styles.featureMedia}>
              <ProductMedia product={featured} media={featured.media[0]} decorative sizes="240px" />
            </span>
          )}
          <span className={styles.featureText}>
            <span className="eyebrow">Chapter 01</span>
            <span className={styles.featureTitle}>Ascent</span>
            <span className="t-label link">Ver colección</span>
          </span>
        </Link>
      </div>
    </LiquidGlass>
  );
}
