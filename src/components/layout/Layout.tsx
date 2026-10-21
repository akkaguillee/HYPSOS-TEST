import { CartDrawer } from '@/components/commerce/CartDrawer';
import { IntroLoader } from '@/components/motion/IntroLoader';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ScrollTrigger } from '@/lib/motion';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';
import styles from './Layout.module.css';
import { MobileMenu } from './MobileMenu';
import { SearchPanel } from './SearchPanel';

export function Layout() {
  const location = useLocation();
  const navigation = useNavigation();
  const announcement = useUi((state) => state.announcement);
  const closePanel = useUi((state) => state.closePanel);
  const closeCart = useCart((state) => state.close);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const isHome = location.pathname === '/';

  useDocumentMeta(location.pathname);

  // Al cambiar de página: cerrar paneles, mover el foco al contenido y recalcular animaciones de scroll.
  useEffect(() => {
    closePanel();
    closeCart();
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, closePanel, closeCart]);

  return (
    <>
      <a href="#main" className={styles.skip}>
        Saltar al contenido
      </a>
      <div className={styles.progress} data-loading={navigation.state === 'loading'} aria-hidden="true" />
      <IntroLoader />
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main} data-home={isHome}>
        <Outlet />
      </main>
      <Footer />
      <MobileMenu />
      <SearchPanel />
      <CartDrawer />
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <ScrollRestoration getKey={(entry) => entry.pathname} />
    </>
  );
}
