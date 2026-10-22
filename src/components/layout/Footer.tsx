import { Wordmark } from '@/components/brand/BrandVector';
import { Reveal } from '@/components/motion/Reveal';
import { helpNav, legalNav, shopNav } from '@/content/navigation';
import { useConsent } from '@/store/consent';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { store } from '@shared/config';
import { paths } from '@shared/routes';
import { useRef } from 'react';
import { Link } from 'react-router';
import styles from './Footer.module.css';
import { Newsletter } from './Newsletter';

export function Footer() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const openCookies = useConsent((state) => state.openPanel);

  useGSAP(
    () => {
      if (reduced) return;
      // El logotipo emerge desde abajo al llegar al final de la página.
      gsap.from(`.${styles.wordmark} svg`, {
        yPercent: 40,
        opacity: 0,
        duration: 1.2,
        ease: 'expo.out',
        scrollTrigger: { trigger: `.${styles.wordmark}`, start: 'top 98%', once: true },
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  const year = new Date().getFullYear();

  return (
    <footer ref={root} className={styles.footer} data-theme="dark">
      <div className="container">
        <Newsletter />
        <div className={styles.top}>
          <Reveal className={styles.intro}>
            <p className={styles.slogan}>Built for the climb.</p>
            <p className="t-small t-muted">Streetwear independiente construido alrededor de una idea: seguir subiendo.</p>
            {store.social.length > 0 && (
              <ul role="list" className={styles.social} aria-label="Redes sociales">
                {store.social.map((network) => (
                  <li key={network.id}>
                    <a href={network.href} target="_blank" rel="noopener noreferrer">
                      {network.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <nav className={styles.columns} aria-label="Pie de página">
            <div>
              <p className={`eyebrow ${styles.columnTitle}`}>Tienda</p>
              <ul role="list" className={styles.links}>
                <li>
                  <Link to={paths.collection('novedades')} viewTransition>
                    Novedades
                  </Link>
                </li>
                {[...shopNav.apparel, ...shopNav.more].map((category) => (
                  <li key={category.handle}>
                    <Link to={paths.collection(category.handle)} viewTransition>
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`eyebrow ${styles.columnTitle}`}>Ayuda</p>
              <ul role="list" className={styles.links}>
                {helpNav.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} viewTransition>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`eyebrow ${styles.columnTitle}`}>HYPSOS</p>
              <ul role="list" className={styles.links}>
                <li>
                  <Link to={paths.page('nosotros')} viewTransition>
                    Quiénes somos
                  </Link>
                </li>
                <li>
                  <Link to={paths.collection('colecciones')} viewTransition>
                    Colecciones
                  </Link>
                </li>
                <li>
                  <Link to={paths.account} viewTransition>
                    Mi cuenta
                  </Link>
                </li>
                <li>
                  <Link to={paths.wishlist} viewTransition>
                    Favoritos
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className={`eyebrow ${styles.columnTitle}`}>Legal</p>
              <ul role="list" className={styles.links}>
                {legalNav.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} viewTransition>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button type="button" className={styles.linkButton} onClick={openCookies}>
                    Preferencias de cookies
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className={styles.wordmark}>
          <Wordmark title="HYPSOS" />
        </div>

        <div className={styles.bottom}>
          <p>
            © {year} {store.name}. Todos los derechos reservados.
          </p>
          <div className={styles.bottomMeta}>
            <span>España · EUR €</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
