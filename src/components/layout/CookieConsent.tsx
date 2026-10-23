import filterStyles from '@/components/commerce/Filters.module.css';
import { Button } from '@/components/ui/Button';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { Modal } from '@/components/ui/Modal';
import { clearAnalyticsCookies, hasAnalyticsProvider, track } from '@/lib/analytics';
import { useConsent } from '@/store/consent';
import { paths } from '@shared/routes';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import styles from './CookieConsent.module.css';

/**
 * Consentimiento de cookies (criterio AEPD): solo aparece si hay analítica configurada,
 * «Aceptar» y «Rechazar» tienen el mismo peso y la decisión se puede cambiar en cualquier
 * momento desde el pie de página.
 */
export function CookieConsent() {
  const analytics = useConsent((state) => state.analytics);
  const panelOpen = useConsent((state) => state.panelOpen);
  const decide = useConsent((state) => state.decide);
  const openPanel = useConsent((state) => state.openPanel);
  const closePanel = useConsent((state) => state.closePanel);
  const { pathname } = useLocation();
  const provider = hasAnalyticsProvider();
  const [draft, setDraft] = useState(analytics === true);
  const [wasOpen, setWasOpen] = useState(panelOpen);
  if (panelOpen !== wasOpen) {
    setWasOpen(panelOpen);
    if (panelOpen) setDraft(analytics === true);
  }

  const choose = (value: boolean) => {
    decide(value);
    if (value) track('page_view', { path: pathname });
    else clearAnalyticsCookies();
  };

  return (
    <>
      {provider && analytics === null && !panelOpen && (
        <LiquidGlass
          as="section"
          radius={20}
          bezel={18}
          refraction={22}
          data-theme="dark"
          className={styles.banner}
          aria-labelledby="cookie-title"
          role="region"
        >
          <h2 id="cookie-title" className={styles.title}>
            Cookies
          </h2>
          <p className={styles.text}>
            Usamos almacenamiento necesario para el carrito y, si nos dejas, analítica anónima para mejorar la tienda. Puedes cambiarlo cuando quieras.{' '}
            <Link to={paths.page('cookies')}>Más información</Link>.
          </p>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => choose(false)}>
              Rechazar
            </Button>
            <Button variant="outline" onClick={() => choose(true)}>
              Aceptar
            </Button>
          </div>
          <button
            type="button"
            className={styles.manage}
            onClick={openPanel}
          >
            Configurar
          </button>
        </LiquidGlass>
      )}

      <Modal open={panelOpen} onClose={closePanel} title="Preferencias de cookies">
        <div>
          <div className={styles.row}>
            <div>
              <strong>Necesarias</strong>
              <p>Carrito, favoritos, sesión de tu cuenta y estas preferencias. Sin ellas la tienda no funciona.</p>
            </div>
            <span className={styles.always}>Siempre activas</span>
          </div>
          <div className={styles.row}>
            <div>
              <strong>Analítica</strong>
              <p>
                {provider
                  ? 'Medición anónima de visitas, búsquedas y compras para mejorar la tienda. No se usa para publicidad.'
                  : 'Esta web no utiliza analítica ahora mismo. Si se activa, se te pedirá permiso.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft}
              aria-label="Analítica"
              className={filterStyles.toggle}
              disabled={!provider}
              onClick={() => setDraft((value) => !value)}
            >
              <span className={filterStyles.switch} aria-hidden="true" />
            </button>
          </div>
          <div className={`${styles.actions} ${styles.panelActions}`}>
            <Button variant="outline" onClick={() => choose(false)}>
              Rechazar todo
            </Button>
            <Button onClick={() => choose(draft)}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
