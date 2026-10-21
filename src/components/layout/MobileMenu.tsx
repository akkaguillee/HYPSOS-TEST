import { Wordmark } from '@/components/brand/BrandVector';
import { Drawer } from '@/components/ui/Drawer';
import { helpNav, shopNav } from '@/content/navigation';
import { useUi } from '@/store/ui';
import { newArrivals, products, productsByCategory, productsByCollection } from '@shared/catalog';
import { store } from '@shared/config';
import { paths } from '@shared/routes';
import type { CSSProperties } from 'react';
import { NavLink } from 'react-router';
import styles from './MobileMenu.module.css';

export function MobileMenu() {
  const open = useUi((state) => state.panel === 'menu');
  const close = useUi((state) => state.closePanel);

  const primary = [
    { to: paths.collection('novedades'), label: 'Novedades', count: newArrivals().length },
    ...[...shopNav.apparel, ...shopNav.more].map((category) => ({
      to: paths.collection(category.handle),
      label: category.name,
      count: productsByCategory(category.handle).length,
    })),
    { to: paths.collection('all'), label: 'Ver todo', count: products.length },
  ];

  return (
    <Drawer
      open={open}
      onClose={close}
      side="left"
      width="480px"
      title="Menú"
      headerContent={
        <span className={styles.brand}>
          <Wordmark />
        </span>
      }
    >
      <div className={styles.body}>
        <nav aria-label="Tienda">
          <ul role="list" className={styles.primary}>
            {primary.map((item, index) => (
              <li key={item.to} className={styles.item} style={{ '--i': index } as CSSProperties}>
                <NavLink to={item.to} className={styles.bigLink} onClick={close} viewTransition>
                  {item.label}
                  <span className={styles.count}>{item.count}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className={`eyebrow ${styles.groupTitle}`}>Colecciones</p>
          <ul role="list" className={styles.secondary}>
            {shopNav.collections.map((collection) => (
              <li key={collection.handle}>
                <NavLink to={paths.collection(collection.handle)} onClick={close} viewTransition>
                  {collection.kicker} — {collection.name} ({productsByCollection(collection.handle).length})
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={`eyebrow ${styles.groupTitle}`}>HYPSOS</p>
          <ul role="list" className={styles.secondary}>
            <li>
              <NavLink to={paths.page('nosotros')} onClick={close} viewTransition>
                Quiénes somos
              </NavLink>
            </li>
            <li>
              <NavLink to={paths.wishlist} onClick={close} viewTransition>
                Favoritos
              </NavLink>
            </li>
            {helpNav.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} onClick={close} viewTransition>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <ul role="list" className={styles.social} aria-label="Redes sociales">
          {store.social.map((network) => (
            <li key={network.id}>
              <a href={network.href} target="_blank" rel="noopener noreferrer">
                {network.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  );
}
