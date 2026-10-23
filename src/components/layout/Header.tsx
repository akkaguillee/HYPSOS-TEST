import { Wordmark } from '@/components/brand/BrandVector';
import { IconButton, IconLink } from '@/components/ui/Button';
import { LiquidGlass, type LensControl } from '@/components/ui/LiquidGlass';
import { primaryNav } from '@/content/navigation';
import { useScrollState } from '@/hooks/useScrollState';
import { useLiquidWobble } from '@/hooks/useLiquidWobble';
import { useSurfaceTone } from '@/hooks/useSurfaceTone';
import { cn } from '@/lib/cn';
import { cartCount, useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import { useWishlist } from '@/store/wishlist';
import { paths } from '@shared/routes';
import { useAuth } from '@/store/auth';
import { useIntro } from '@/store/intro';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnnouncementBar } from './AnnouncementBar';
import styles from './Header.module.css';
import { MegaMenu } from './MegaMenu';

export function Header() {
  const { pathname } = useLocation();
  const { scrolled, direction } = useScrollState(40);
  const panel = useUi((state) => state.panel);
  const openPanel = useUi((state) => state.openPanel);
  const count = useCart((state) => cartCount(state.lines));
  const openCart = useCart((state) => state.open);
  const cartOpen = useCart((state) => state.isOpen);
  const wishlistCount = useWishlist((state) => state.productIds.length);
  const accountName = useAuth((state) => state.user?.name);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaId = useId();
  const megaTrigger = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const bar = useRef<HTMLDivElement>(null);
  const lens = useRef<LensControl>(null);
  useLiquidWobble(lens);
  const introPhase = useIntro((state) => state.phase);
  const surface = useSurfaceTone(bar, `${pathname}|${introPhase}`);
  // Con el megamenú abierto, cabecera y panel comparten el cristal oscuro.
  const tone = megaOpen ? 'dark' : surface;
  const hidden = scrolled && direction === 'down' && !megaOpen && !panel && !cartOpen;

  // Cerrar el mega menú al navegar.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMegaOpen(false);
  }

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMegaOpen(false);
        megaTrigger.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [megaOpen]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // Expone el estado del header para que las barras fijas (filtros, compra móvil) se recoloquen.
  useEffect(() => {
    document.documentElement.dataset.header = hidden ? 'hidden' : 'visible';
  }, [hidden]);

  // Intención de hover: abre con un pequeño retardo y cierra con margen para mover el cursor.
  const scheduleMega = (open: boolean, delay: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMegaOpen(open), delay);
  };

  return (
    <div className={styles.top} data-condensed={scrolled} data-hidden={hidden} data-surface-ignore>
      <AnnouncementBar />
      <div className={styles.frame}>
        <header className={styles.header} onMouseLeave={() => megaOpen && scheduleMega(false, 180)}>
          {/* Toda la píldora es una gota de agua (perfil «drop», bisel = media altura): el borde comprime
              y el centro amplía lo que pasa por detrás, con aberración cromática en el filo. Al hacer
              scroll la gota se carga con la velocidad y rebota al parar (useLiquidWobble). */}
          <LiquidGlass
            ref={bar}
            lensRef={lens}
            radius="pill"
            bezel={64}
            refraction={13}
            profile="drop"
            frost={0}
            aberration={0.1}
            tone={tone}
            interactive
            className={styles.bar}
          >
            <div className={styles.left}>
              <IconButton
                label="Abrir menú"
                className={styles.menuButton}
                onClick={() => openPanel('menu')}
                aria-expanded={panel === 'menu'}
                aria-haspopup="dialog"
              >
                <Menu aria-hidden="true" />
              </IconButton>
              <IconButton label="Buscar" className={styles.menuButton} onClick={() => openPanel('search')} aria-haspopup="dialog">
                <Search aria-hidden="true" />
              </IconButton>
              <nav aria-label="Principal" className={styles.nav}>
                <ul role="list" className={styles.navList}>
                  {primaryNav.map((item) =>
                    'mega' in item ? (
                      <li key={item.id} onMouseEnter={() => scheduleMega(true, 90)}>
                        <button
                          ref={megaTrigger}
                          type="button"
                          className={cn(styles.navLink, pathname.startsWith('/collections') && !megaOpen && styles.active)}
                          aria-expanded={megaOpen}
                          aria-controls={megaId}
                          onClick={() => {
                            window.clearTimeout(hoverTimer.current);
                            setMegaOpen((open) => !open);
                          }}
                        >
                          {item.label}
                          <ChevronDown className={styles.chevron} aria-hidden="true" />
                        </button>
                      </li>
                    ) : (
                      <li key={item.id} onMouseEnter={() => megaOpen && scheduleMega(false, 120)}>
                        <NavLink to={item.to} className={({ isActive }) => cn(styles.navLink, isActive && styles.active)} viewTransition>
                          {item.label}
                        </NavLink>
                      </li>
                    ),
                  )}
                </ul>
              </nav>
            </div>

            <Link to={paths.home} className={styles.logo} aria-label="HYPSOS, ir a la portada" viewTransition>
              <Wordmark />
            </Link>

            <div className={styles.actions}>
              <IconButton label="Buscar" className={styles.desktopOnly} onClick={() => openPanel('search')} aria-haspopup="dialog">
                <Search aria-hidden="true" />
              </IconButton>
              <IconLink to={paths.account} label={accountName ? `Mi cuenta (${accountName})` : 'Mi cuenta'} className={styles.accountLink}>
                <User aria-hidden="true" />
                {accountName && <span className={styles.accountDot} aria-hidden="true" />}
              </IconLink>
              <IconLink
                to={paths.wishlist}
                className={styles.desktopOnly}
                label={`Favoritos${wishlistCount ? ` (${wishlistCount})` : ''}`}
                badge={wishlistCount}
                badgeKey={wishlistCount}
              >
                <Heart aria-hidden="true" />
              </IconLink>
              <IconButton
                label={`Carrito, ${count} ${count === 1 ? 'artículo' : 'artículos'}`}
                onClick={openCart}
                badge={count}
                badgeKey={count}
                aria-haspopup="dialog"
              >
                <ShoppingBag aria-hidden="true" />
              </IconButton>
            </div>
          </LiquidGlass>
          <MegaMenu id={megaId} open={megaOpen} onNavigate={() => setMegaOpen(false)} onMouseEnter={() => window.clearTimeout(hoverTimer.current)} />
        </header>
      </div>
    </div>
  );
}
