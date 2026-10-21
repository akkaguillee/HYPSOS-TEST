import type { Env } from './env';

/** Configuración pública de analítica que se inyecta en el HTML (la web solo la activa tras el consentimiento). */
export interface AnalyticsConfig {
  plausibleDomain?: string;
  ga4Id?: string;
}

export function analyticsConfig(env: Env): AnalyticsConfig {
  return {
    ...(env.PLAUSIBLE_DOMAIN ? { plausibleDomain: env.PLAUSIBLE_DOMAIN } : {}),
    ...(/^G-[A-Z0-9]+$/.test(env.GA4_MEASUREMENT_ID) ? { ga4Id: env.GA4_MEASUREMENT_ID } : {}),
  };
}

/** Orígenes externos que la CSP debe permitir según los proveedores configurados. */
export function analyticsOrigins(config: AnalyticsConfig) {
  const script: string[] = [];
  const connect: string[] = [];
  if (config.plausibleDomain) {
    script.push('https://plausible.io');
    connect.push('https://plausible.io');
  }
  if (config.ga4Id) {
    script.push('https://www.googletagmanager.com');
    connect.push('https://www.google-analytics.com', 'https://region1.google-analytics.com');
  }
  return { script, connect };
}
