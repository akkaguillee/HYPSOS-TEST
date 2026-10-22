/*
 * Liquid Glass — núcleo óptico (sin React).
 *
 * Genera el mapa de desplazamiento que usa el filtro SVG de <LiquidGlass>:
 *
 * 1. El elemento se modela como un rectángulo redondeado (o píldora) con un bisel de ancho B.
 *    La distancia firmada (SDF) al contorno da, para cada píxel, cuánto se ha adentrado en el
 *    bisel (t ∈ [0, 1]) y la normal 2D del borde (hacia fuera).
 * 2. El bisel tiene un perfil de altura convexo (squircle o arco circular). De su pendiente sale la
 *    normal de la superficie; un rayo vertical que entra en un vidrio de índice n ≈ 1.5 se desvía
 *    (Snell) y llega al fondo desplazado lateralmente. Ese desplazamiento, normalizado a [0, 1],
 *    es la magnitud del mapa; su dirección es la normal 2D hacia dentro.
 * 3. Se codifica X en R e Y en G (128 = sin desplazamiento). La zona plana interior vale 128/128:
 *    el texto que queda detrás del centro no se deforma; solo los bordes doblan el fondo.
 *
 * `feDisplacementMap` aplica P'(x, y) = P(x + scale · (R/255 − 0.5), …); con el valor
 * 128 + 127·v el desplazamiento real es ≈ scale · v / 2, así que el componente usa
 * `scale = 2 · refraction` para que `refraction` sea el desplazamiento máximo en px CSS.
 */

export type GlassProfile = 'squircle' | 'circle';

export interface DisplacementMapOptions {
  /** Ancho del elemento en px CSS. */
  width: number;
  /** Alto del elemento en px CSS. */
  height: number;
  /** Radio de esquina en px CSS, o 'pill' (= mitad del lado menor). */
  radius: number | 'pill';
  /** Ancho del bisel que refracta, en px CSS. */
  bezel: number;
  /** Perfil de altura del bisel. */
  profile?: GlassProfile;
  /** Índice de refracción del vidrio. */
  refractiveIndex?: number;
  /** Lado máximo del mapa en píxeles (el SVG lo estira al tamaño CSS). */
  maxResolution?: number;
}

export interface ResolvedGeometry {
  width: number;
  height: number;
  radius: number;
  bezel: number;
}

export const NEUTRAL = 128;
export const DEFAULT_REFRACTIVE_INDEX = 1.5;
export const DEFAULT_MAX_RESOLUTION = 640;
const PROFILE_SAMPLES = 256;

/** Ajusta radio y bisel a lo que permite el tamaño (enteros, para que la caché sea estable). */
export function resolveGeometry(width: number, height: number, radius: number | 'pill', bezel: number): ResolvedGeometry {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const half = Math.min(w, h) / 2;
  const r = radius === 'pill' ? half : Math.min(Math.max(0, radius), half);
  const b = Math.min(Math.max(0, bezel), half);
  return { width: w, height: h, radius: Math.round(r * 2) / 2, bezel: Math.round(b * 2) / 2 };
}

/**
 * Altura normalizada del bisel en t ∈ [0, 1] (0 = borde exterior, 1 = inicio de la zona plana).
 * Ambos perfiles son convexos, valen 0 en el borde y 1 con pendiente nula al final del bisel.
 */
export function profileHeight(t: number, profile: GlassProfile = 'squircle'): number {
  const x = Math.min(1, Math.max(0, t));
  const u = 1 - x;
  if (profile === 'circle') return Math.sqrt(1 - u * u);
  return Math.pow(1 - u ** 4, 0.25);
}

/**
 * Desplazamiento lateral (sin normalizar) de un rayo vertical al atravesar el bisel en t.
 * Superficie de altura y = f(t) (bisel tan alto como ancho): la normal forma θ₁ = atan(f'(t))
 * con la vertical; el rayo refractado sale con θ₂ = asin(sin θ₁ / n) y se desvía θ₁ − θ₂.
 * Recorre el espesor f(t) + base hasta el fondo: d = (f(t) + base) · tan(θ₁ − θ₂).
 */
export function refractionOffset(t: number, profile: GlassProfile = 'squircle', n = DEFAULT_REFRACTIVE_INDEX): number {
  if (t >= 1) return 0;
  const x = Math.max(0, t);
  const eps = 1e-3;
  const a = Math.max(0, x - eps);
  const b = Math.min(1, x + eps);
  const slope = (profileHeight(b, profile) - profileHeight(a, profile)) / (b - a);
  const theta1 = Math.atan(slope);
  const theta2 = Math.asin(Math.sin(theta1) / n);
  const base = 0.15; // espesor de la lámina plana bajo el bisel (relativo al bisel)
  return (profileHeight(x, profile) + base) * Math.tan(theta1 - theta2);
}

/** Tabla del desplazamiento normalizado (máximo = 1) a lo largo del bisel. */
const lutCache = new Map<string, Float32Array>();
export function refractionLut(profile: GlassProfile = 'squircle', n = DEFAULT_REFRACTIVE_INDEX): Float32Array {
  const key = `${profile}:${n}`;
  const cached = lutCache.get(key);
  if (cached) return cached;
  const lut = new Float32Array(PROFILE_SAMPLES + 1);
  let max = 0;
  for (let i = 0; i <= PROFILE_SAMPLES; i++) {
    const v = refractionOffset(i / PROFILE_SAMPLES, profile, n);
    lut[i] = v;
    if (v > max) max = v;
  }
  if (max > 0) for (let i = 0; i <= PROFILE_SAMPLES; i++) lut[i] /= max;
  lutCache.set(key, lut);
  return lut;
}

function sampleLut(lut: Float32Array, t: number): number {
  if (t <= 0) return lut[0];
  if (t >= 1) return 0;
  const f = t * PROFILE_SAMPLES;
  const i = Math.floor(f);
  return lut[i] + (lut[i + 1] - lut[i]) * (f - i);
}

/**
 * SDF de un rectángulo redondeado centrado en el origen, con su gradiente (normal exterior).
 * `hx`/`hy` son los semilados; `r` el radio. Negativo dentro.
 */
export function roundedRectSdf(px: number, py: number, hx: number, hy: number, r: number): { d: number; nx: number; ny: number } {
  const qx = Math.abs(px) - hx + r;
  const qy = Math.abs(py) - hy + r;
  const sx = px < 0 ? -1 : 1;
  const sy = py < 0 ? -1 : 1;
  if (qx > 0 && qy > 0) {
    const len = Math.hypot(qx, qy);
    return { d: len - r, nx: (sx * qx) / len, ny: (sy * qy) / len };
  }
  if (qx > qy) return { d: qx - r, nx: sx, ny: 0 };
  return { d: qy - r, nx: 0, ny: sy };
}

export interface DisplacementField {
  /** Tamaño del mapa en píxeles (puede ser menor que el CSS por el límite de resolución). */
  width: number;
  height: number;
  /** RGBA, 8 bits por canal. R = X, G = Y, B = 128, A = 255. */
  data: Uint8ClampedArray;
  geometry: ResolvedGeometry;
}

/**
 * Calcula el campo de desplazamiento en un buffer RGBA. Puro y sin DOM: se puede testear y
 * mover a un worker. La dirección apunta hacia dentro (se muestrea el fondo hacia el centro, como
 * una lente convexa), así nunca se lee fuera del elemento.
 */
export function computeDisplacementField(options: DisplacementMapOptions): DisplacementField {
  const geometry = resolveGeometry(options.width, options.height, options.radius, options.bezel);
  const { width, height, radius, bezel } = geometry;
  const maxRes = Math.max(16, options.maxResolution ?? DEFAULT_MAX_RESOLUTION);
  const scale = Math.min(1, maxRes / Math.max(width, height));
  const mw = Math.max(1, Math.round(width * scale));
  const mh = Math.max(1, Math.round(height * scale));
  const lut = refractionLut(options.profile ?? 'squircle', options.refractiveIndex ?? DEFAULT_REFRACTIVE_INDEX);

  const data = new Uint8ClampedArray(mw * mh * 4);
  const hx = width / 2;
  const hy = height / 2;
  // Píxel del mapa → coordenada CSS de su centro.
  const sx = width / mw;
  const sy = height / mh;

  for (let j = 0; j < mh; j++) {
    const py = (j + 0.5) * sy - hy;
    for (let i = 0; i < mw; i++) {
      const o = (j * mw + i) * 4;
      let r = NEUTRAL;
      let g = NEUTRAL;
      if (bezel > 0) {
        const px = (i + 0.5) * sx - hx;
        const { d, nx, ny } = roundedRectSdf(px, py, hx, hy, radius);
        const inset = -d; // distancia hacia dentro desde el borde
        if (inset < bezel) {
          const mag = sampleLut(lut, Math.max(0, inset) / bezel);
          // Hacia dentro = −normal exterior.
          r = NEUTRAL - nx * mag * 127;
          g = NEUTRAL - ny * mag * 127;
        }
      }
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = NEUTRAL;
      data[o + 3] = 255;
    }
  }
  return { width: mw, height: mh, data, geometry };
}

/** Clave de caché del mapa: `w×h×radio×bisel` (+ perfil/índice/resolución). */
export function mapCacheKey(options: DisplacementMapOptions): string {
  const g = resolveGeometry(options.width, options.height, options.radius, options.bezel);
  return `${g.width}x${g.height}x${g.radius}x${g.bezel}:${options.profile ?? 'squircle'}:${options.refractiveIndex ?? DEFAULT_REFRACTIVE_INDEX}:${options.maxResolution ?? DEFAULT_MAX_RESOLUTION}`;
}

const MAP_CACHE_LIMIT = 48;
const mapCache = new Map<string, string>();

/**
 * Mapa como data URL PNG, cacheado (LRU) por geometría. Devuelve null sin canvas (SSR, tests).
 */
export function getDisplacementMapUrl(options: DisplacementMapOptions): string | null {
  const key = mapCacheKey(options);
  const hit = mapCache.get(key);
  if (hit) {
    mapCache.delete(key);
    mapCache.set(key, hit);
    return hit;
  }
  if (typeof document === 'undefined') return null;
  const field = computeDisplacementField(options);
  const canvas = document.createElement('canvas');
  canvas.width = field.width;
  canvas.height = field.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(field.width, field.height);
  image.data.set(field.data);
  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL('image/png');
  mapCache.set(key, url);
  if (mapCache.size > MAP_CACHE_LIMIT) {
    const oldest = mapCache.keys().next().value;
    if (oldest !== undefined) mapCache.delete(oldest);
  }
  return url;
}

/** Solo para tests. */
export function clearDisplacementMapCache(): void {
  mapCache.clear();
}

interface NavigatorUAData {
  brands?: { brand: string; version: string }[];
}

/**
 * ¿Aplica el navegador filtros SVG `url(#id)` en `backdrop-filter`?
 *
 * Hoy solo Blink (Chrome, Edge, Opera, Brave, Samsung Internet…). Safari acepta la sintaxis pero
 * ignora la referencia, y Firefox no la aplica; ambos dan positivo en
 * `CSS.supports('backdrop-filter', 'url(#a)')` porque el valor es sintácticamente válido, así que
 * esa prueba no sirve. No hay forma de leer el resultado del backdrop desde JS (no se puede pintar
 * el backdrop en un canvas), así que se detecta el motor:
 * - `navigator.userAgentData.brands` con "Chromium": solo lo expone Blink (Safari y Firefox no
 *   implementan User-Agent Client Hints).
 * - Respaldo para Blink sin UA-CH (contextos no seguros, versiones viejas): `window.chrome` y un UA
 *   `Chrome/`, excluyendo Chrome/Firefox/Edge de iOS, que por dentro son WebKit.
 */
export function supportsSvgBackdropFilter(win: (Window & typeof globalThis) | null = typeof window === 'undefined' ? null : window): boolean {
  if (!win) return false;
  const css = win.CSS;
  if (!css?.supports || !(css.supports('backdrop-filter', 'blur(1px)'))) return false;
  const nav = win.navigator as Navigator & { userAgentData?: NavigatorUAData };
  const brands = nav.userAgentData?.brands;
  if (brands && brands.length > 0) return brands.some((b) => /chromium/i.test(b.brand));
  const ua = nav.userAgent ?? '';
  if (/CriOS|FxiOS|EdgiOS|Firefox\//.test(ua)) return false;
  return 'chrome' in win && /Chrome\/\d+/.test(ua);
}
