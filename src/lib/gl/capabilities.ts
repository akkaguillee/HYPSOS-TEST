/**
 * Comprobaciones baratas (bundle principal) antes de cargar la capa WebGL de producto.
 * Sin dependencias: el renderizador y GSAP solo se descargan en el primer hover real.
 */

interface MediaQueryEnv {
  matchMedia?: (query: string) => { matches: boolean };
  WebGLRenderingContext?: unknown;
}

export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** ¿Merece la pena intentar el efecto? Puntero fino, sin movimiento reducido y con WebGL en el navegador. */
export function canAttemptHoverGL(env: MediaQueryEnv | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  if (!env || typeof env.matchMedia !== 'function') return false;
  if (!env.matchMedia(FINE_POINTER_QUERY).matches) return false;
  if (env.matchMedia(REDUCED_MOTION_QUERY).matches) return false;
  return typeof env.WebGLRenderingContext !== 'undefined';
}

/** Renderizadores por software (sin GPU): el efecto baja de calidad y vigila su coste por fotograma. */
export function isSoftwareRenderer(renderer: string | null | undefined): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(renderer ?? '');
}

/** Puntero de ratón o lápiz con hover (nunca táctil). */
export const isHoverPointer = (event: Pick<PointerEvent, 'pointerType'>) => event.pointerType === 'mouse' || event.pointerType === 'pen';

/** Tiempo máximo que se retiene el fundido CSS esperando a WebGL antes de dejarlo correr. */
export const PENDING_MS = 180;

/**
 * Retiene el fundido CSS de la trasera (atributo `data-gl-pending`) mientras se preparan las texturas,
 * para que la transición WebGL arranque desde la delantera. Pasado `PENDING_MS` se suelta sola:
 * si WebGL no llega a tiempo, el fundido CSS sigue como siempre.
 */
export function holdCssSwap(host: Element | null, ms = PENDING_MS): void {
  if (!(host instanceof HTMLElement)) return;
  host.setAttribute('data-gl-pending', '');
  const token = String(Date.now() + Math.random());
  host.dataset.glPendingToken = token;
  window.setTimeout(() => releaseCssSwap(host, token), ms);
}

/** Suelta la retención (sin `token`, siempre; con `token`, solo si sigue siendo la misma retención). */
export function releaseCssSwap(host: HTMLElement, token?: string): void {
  if (token !== undefined && host.dataset.glPendingToken !== token) return;
  host.removeAttribute('data-gl-pending');
  delete host.dataset.glPendingToken;
}
