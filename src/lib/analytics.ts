import { useConsent } from '@/store/consent';

/**
 * Analítica configurable y respetuosa con el consentimiento.
 * - El servidor inyecta qué proveedor hay configurado (Plausible o GA4) en <meta name="hypsos:analytics">.
 * - Nada se carga ni se envía hasta que el usuario acepta la analítica.
 * - Los eventos no incluyen datos personales (ni emails, ni nombres, ni direcciones).
 */

export interface AnalyticsConfig {
  plausibleDomain?: string;
  ga4Id?: string;
}

export type AnalyticsEvent =
  | { name: 'page_view'; params: { path: string } }
  | { name: 'view_item'; params: { item_id: string; item_name: string; price: number; item_category: string } }
  | { name: 'search'; params: { search_term: string; results: number } }
  | { name: 'filter'; params: { filter: string; value: string } }
  | { name: 'select_variant'; params: { item_id: string; variant: string } }
  | { name: 'add_to_cart'; params: { item_id: string; variant: string; price: number; quantity: number } }
  | { name: 'begin_checkout'; params: { value: number; items: number } }
  | { name: 'purchase'; params: { transaction_id: string; value: number; items: number } }
  | { name: 'newsletter_subscribe'; params: { source: string } }
  | { name: 'sign_up'; params: Record<string, never> };

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    plausible?: ((name: string, options?: { props?: Record<string, unknown>; u?: string }) => void) & { q?: unknown[] };
  }
}

let cachedConfig: AnalyticsConfig | null = null;
let loaded = false;

export function analyticsConfig(): AnalyticsConfig {
  if (cachedConfig) return cachedConfig;
  try {
    const content = document.querySelector<HTMLMetaElement>('meta[name="hypsos:analytics"]')?.content;
    cachedConfig = content ? (JSON.parse(content) as AnalyticsConfig) : {};
  } catch {
    cachedConfig = {};
  }
  return cachedConfig;
}

export const hasAnalyticsProvider = () => Boolean(analyticsConfig().plausibleDomain || analyticsConfig().ga4Id);

function loadScript(src: string, attributes: Record<string, string> = {}) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
  document.head.appendChild(script);
}

/** Carga los proveedores configurados. Solo se llama con consentimiento. */
function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  const config = analyticsConfig();
  if (config.plausibleDomain) {
    window.plausible =
      window.plausible ??
      Object.assign((...args: unknown[]) => (window.plausible!.q = window.plausible!.q ?? []).push(args), { q: [] as unknown[] });
    loadScript('https://plausible.io/js/script.manual.js', { 'data-domain': config.plausibleDomain, defer: '' });
  }
  if (config.ga4Id) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', config.ga4Id, { send_page_view: false, anonymize_ip: true });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4Id)}`);
  }
}

/** Borra las cookies de GA si el usuario retira el consentimiento. */
export function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name && /^_ga/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname.replace(/^www\./, '.')}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

export function track<E extends AnalyticsEvent>(name: E['name'], params: E['params']) {
  if (typeof window === 'undefined' || !hasAnalyticsProvider() || useConsent.getState().analytics !== true) return;
  ensureLoaded();
  const config = analyticsConfig();
  if (config.plausibleDomain) {
    if (name === 'page_view') window.plausible?.('pageview', { u: location.origin + (params as { path: string }).path });
    else window.plausible?.(name, { props: params });
  }
  if (config.ga4Id) {
    if (name === 'page_view') window.gtag?.('event', 'page_view', { page_path: (params as { path: string }).path });
    else window.gtag?.('event', name, { ...params, currency: 'EUR' });
  }
}

/** Una compra solo se registra una vez por pedido y solo cuando el servidor la confirma como pagada. */
export function trackPurchaseOnce(orderNumber: string, value: number, items: number) {
  const key = 'hypsos-tracked-orders';
  try {
    const tracked: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (tracked.includes(orderNumber)) return;
    localStorage.setItem(key, JSON.stringify([...tracked, orderNumber].slice(-20)));
  } catch {
    // Sin almacenamiento disponible: se registra igualmente una vez en esta carga.
  }
  track('purchase', { transaction_id: orderNumber, value: value / 100, items });
}
