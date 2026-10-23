/**
 * Capa WebGL de interacción con los mockups de producto (chunk diferido: solo se descarga en el primer
 * hover con puntero fino; ver useProductHoverGL).
 *
 * - UN lienzo y UN contexto para toda la página: se monta sobre la caja de imagen que está bajo el cursor
 *   (por encima de las <img>, que siguen en el DOM para SEO, accesibilidad y LCP) y se suelta al terminar
 *   la animación de salida. La siguiente tarjeta lo reutiliza.
 * - Texturas en una caché LRU (12) por URL, creadas a partir de la `currentSrc` de las <img> ya cargadas
 *   (createImageBitmap redimensiona fuera del hilo principal: nada se descarga dos veces).
 * - Modo `swap` (tarjeta): transición líquida delantera → trasera, lupa, estela, inclinación y brillo.
 *   Modo `lens` (ficha): lupa, estela, inclinación sutil y aplastado al pulsar; sin cambio de vista.
 * - El bucle (gsap.ticker) solo corre mientras hay hover o animación; se para en reposo y con la pestaña oculta.
 */
import { gsap, hasFinePointer, prefersReducedMotion } from '@/lib/motion';
import { isHoverPointer, isSoftwareRenderer, releaseCssSwap, holdCssSwap } from './capabilities';
import { LruCache } from './lru';
import {
  canvasDpr,
  clamp01,
  coverTransform,
  cubicBezier,
  insideUv,
  originReach,
  parseCssColor,
  parseCssScale,
  perspectiveFor,
  pointerToUv,
  remainingDuration,
  RIPPLE_LIFE,
  rippleAmplitude,
  textureTargetSize,
  tiltAngles,
  type Rect,
} from './math';
import { FRAGMENT_SHADER, MAX_RIPPLES, VERTEX_SHADER } from './shaders';

export type HoverMode = 'swap' | 'lens';

export interface AttachOptions {
  mode: HoverMode;
  /** Primer evento (el que disparó la carga del chunk). */
  initialEvent?: PointerEvent;
}

const MEDIA_SELECTOR = '[data-product-media]';
/** Controles dentro de la caja de imagen sobre los que la caja no se inclina ni hace lupa. */
const CALM_SELECTOR = '[data-gl-calm], button, a, input, select';
const TEXTURE_CACHE_SIZE = 12;
const STUDIO_BG: [number, number, number] = [236 / 255, 233 / 255, 227 / 255];

/** Ajustes por modo. `zoom` replica el `scale(1.035)` CSS de la tarjeta; `lift` cubre las esquinas al inclinar dentro del marco. */
const MODES = {
  swap: { tilt: 6, perspective: 2.4, perspectiveMin: 800, zoom: 1.035, lift: 1, press: false },
  lens: { tilt: 3, perspective: 2.5, perspectiveMin: 900, zoom: 1, lift: 1.03, press: true },
} as const;

const SWAP_DURATION = 0.9;
/** Curva propia de la transición: arranque contenido, flujo y un asentamiento largo. */
const LIQUID_EASE = cubicBezier(0.4, 0.05, 0.25, 1);
/** --ease-out de los tokens CSS (mismo ritmo que el zoom y el fundido CSS). */
const CSS_EASE_OUT = cubicBezier(0.22, 1, 0.36, 1);
const CSS_SWAP_DURATION = 0.56;
const LENS_RADIUS = 0.18;

type GL = WebGLRenderingContext;

interface TextureEntry {
  texture: WebGLTexture;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface Ripple {
  u: number;
  v: number;
  birth: number;
  amp: number;
}

interface HoverState {
  progress: number;
  plain: number;
  lens: number;
  press: number;
  zoom: number;
  sheen: number;
  mx: number;
  my: number;
  rx: number;
  ry: number;
  lift: number;
}

const UNIFORMS = [
  'uTex0',
  'uTex1',
  'uCover0',
  'uCover1',
  'uTexSize0',
  'uTexSize1',
  'uSize',
  'uBg',
  'uTime',
  'uOctaves',
  'uProgress',
  'uPlain',
  'uOrigin',
  'uReach',
  'uMouse',
  'uLens',
  'uRadius',
  'uPress',
  'uZoom',
  'uSheen',
  'uRipples',
] as const;

/** Caja de la imagen en el viewport SIN su propia transformación (la inclinación no realimenta el puntero). */
function layoutRect(element: HTMLElement): Rect {
  const parent = element.offsetParent;
  if (parent instanceof HTMLElement) {
    const rect = parent.getBoundingClientRect();
    return {
      left: rect.left + parent.clientLeft + element.offsetLeft - parent.scrollLeft,
      top: rect.top + parent.clientTop + element.offsetTop - parent.scrollTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  }
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/** Primer fondo opaco desde la caja hacia arriba (el fondo de estudio sobre el que se compone la <img>). */
function backgroundOf(element: HTMLElement): [number, number, number] {
  let node: HTMLElement | null = element;
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    const color = parseCssColor(getComputedStyle(node).backgroundColor);
    if (color) return color;
  }
  return STUDIO_BG;
}

function faces(host: HTMLElement, mode: HoverMode): HTMLImageElement[] {
  const images = [...host.querySelectorAll('img')];
  return mode === 'swap' ? images.slice(0, 2) : images.slice(0, 1);
}

// ─── Renderizador compartido ─────────────────────────────────────────────

class Renderer {
  readonly canvas: HTMLCanvasElement;
  gl: GL | null = null;
  webgl2 = false;
  software = false;
  lost = false;
  disabled = false;
  owner: Session | null = null;
  waiting: Session | null = null;
  /** Fotogramas pintados (diagnóstico en desarrollo). */
  draws = 0;
  private waitingSince = 0;
  private program: WebGLProgram | null = null;
  private locations = new Map<string, WebGLUniformLocation | null>();
  private losses = 0;
  private readonly rippleData = new Float32Array(MAX_RIPPLES * 4);
  private readonly inflight = new Map<string, Promise<TextureEntry | null>>();
  private readonly observer: ResizeObserver | null;
  private readonly startedAt = performance.now();
  private readonly graveyard = new Set<WebGLTexture>();
  /** Caja actual en px CSS (se mide al montar y al redimensionar, no en cada fotograma). */
  private boxWidth = 1;
  private boxHeight = 1;
  readonly textures: LruCache<string, TextureEntry>;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.setAttribute('data-gl-canvas', '');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
      zIndex: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    this.textures = new LruCache(TEXTURE_CACHE_SIZE, (entry) => {
      if (this.lost) return;
      // Nunca se borra una textura que el lienzo está pintando (saldría negra): se aplaza hasta soltarlo.
      if (this.owner?.textures.includes(entry)) this.graveyard.add(entry.texture);
      else this.gl?.deleteTexture(entry.texture);
    });
    this.observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            // Corre tras el layout y antes de pintar: redimensionar (borra el búfer) y redibujar en el mismo fotograma.
            const owner = this.owner;
            if (owner && this.fit(owner.host)) this.draw(owner, performance.now());
          });
    this.canvas.addEventListener('webglcontextlost', this.onLost);
    this.canvas.addEventListener('webglcontextrestored', this.onRestored);
  }

  get dpr(): number {
    return canvasDpr(window.devicePixelRatio, this.software);
  }

  init(): boolean {
    const attributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    };
    const gl2 = this.canvas.getContext('webgl2', attributes);
    const gl = (gl2 as unknown as GL | null) ?? this.canvas.getContext('webgl', attributes);
    if (!gl) return false;
    this.gl = gl;
    this.webgl2 = Boolean(gl2);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    this.software = isSoftwareRenderer(debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)));
    return this.build();
  }

  private build(): boolean {
    const gl = this.gl;
    if (!gl) return false;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        if (import.meta.env.DEV) console.warn('[product-hover] shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return false;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (import.meta.env.DEV) console.warn('[product-hover] programa:', gl.getProgramInfoLog(program));
      return false;
    }
    this.program = program;
    this.locations.clear();
    for (const name of UNIFORMS) this.locations.set(name, gl.getUniformLocation(program, name === 'uRipples' ? 'uRipples[0]' : name));
    // Un único triángulo que cubre el lienzo (sin diagonal entre dos triángulos).
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    gl.uniform1i(this.locations.get('uTex0') ?? null, 0);
    gl.uniform1i(this.locations.get('uTex1') ?? null, 1);
    gl.disable(gl.BLEND);
    return true;
  }

  private readonly onLost = (event: Event) => {
    event.preventDefault(); // permite `webglcontextrestored`
    this.lost = true;
    this.losses += 1;
    this.textures.clear(false);
    this.inflight.clear();
    this.graveyard.clear();
    if (this.owner) this.detach(this.owner, true);
    this.waiting = null;
  };

  private readonly onRestored = () => {
    this.lost = false;
    // Tras varias pérdidas, el efecto se apaga para la sesión: queda el fundido CSS.
    if (this.losses > 2 || !this.build()) this.disabled = true;
  };

  get usable(): boolean {
    return Boolean(this.gl && this.program) && !this.lost && !this.disabled;
  }

  /**
   * Textura de una <img> del DOM (por su currentSrc), al tamaño en que se pinta con el zoom de hover
   * (`zoom`): así el fotograma ampliado muestrea texel a píxel, igual que la <img> escalada por CSS.
   */
  texture(image: HTMLImageElement, box: Rect, zoom = 1): Promise<TextureEntry | null> | TextureEntry | null {
    if (!this.usable) return null;
    const key = image.currentSrc || image.src;
    if (!key) return null;
    const cached = this.textures.get(key);
    const natural = image.naturalWidth;
    if (cached && natural) {
      const target = textureTargetSize(box.width * zoom, box.height * zoom, natural, image.naturalHeight, this.dpr);
      if (cached.width >= Math.min(target.width * 0.95, natural)) return cached;
    }
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const job = this.load(image, key, box, zoom).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  private async load(image: HTMLImageElement, key: string, box: Rect, zoom: number): Promise<TextureEntry | null> {
    try {
      if (!image.complete || !image.naturalWidth) await image.decode();
    } catch {
      return null;
    }
    if (!image.naturalWidth || (image.currentSrc || image.src) !== key) return null;
    const target = textureTargetSize(box.width * zoom, box.height * zoom, image.naturalWidth, image.naturalHeight, this.dpr);
    let bitmap: ImageBitmap | null = null;
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(image, {
          resizeWidth: target.width,
          resizeHeight: target.height,
          resizeQuality: 'high',
          premultiplyAlpha: 'premultiply',
          colorSpaceConversion: 'default',
        });
      } catch {
        bitmap = null;
      }
    }
    const gl = this.gl;
    if (!gl || !this.usable) {
      bitmap?.close();
      return null;
    }
    const texture = gl.createTexture();
    if (!texture) return null;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Filas de arriba abajo (sin volteo: el shader trabaja con y hacia abajo) y alfa premultiplicado.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap ?? image);
    const width = bitmap?.width ?? image.naturalWidth;
    const height = bitmap?.height ?? image.naturalHeight;
    const powerOfTwo = (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
    // Sin createImageBitmap la textura llega a tamaño completo: mipmaps donde se pueda para no generar aliasing.
    const mipmaps = !bitmap && (this.webgl2 || powerOfTwo);
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    bitmap?.close();
    const entry: TextureEntry = { texture, width, height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
    this.textures.set(key, entry);
    return entry;
  }

  /** Ajusta el lienzo a la caja (DPR ≤ 2). Devuelve true si cambió (y por tanto hay que redibujar). */
  fit(host: HTMLElement): boolean {
    const dpr = this.dpr;
    this.boxWidth = host.clientWidth || 1;
    this.boxHeight = host.clientHeight || 1;
    const width = Math.max(1, Math.round(this.boxWidth * dpr));
    const height = Math.max(1, Math.round(this.boxHeight * dpr));
    if (this.canvas.width === width && this.canvas.height === height) return false;
    this.canvas.width = width;
    this.canvas.height = height;
    return true;
  }

  /**
   * Pide el lienzo para una sesión. Si lo tiene otra que está saliendo en modo lupa, espera a que termine
   * (máx. 350 ms) para no cortar su lupa; si es una tarjeta, se lo quita y la tarjeta acaba con CSS.
   */
  request(session: Session): boolean {
    if (!this.usable) return false;
    if (this.owner === session) return true;
    const owner = this.owner;
    if (owner && !owner.hovered && owner.mode === 'lens' && owner.state.lens > 0.04) {
      if (this.waiting !== session) this.waitingSince = performance.now();
      this.waiting = session;
      gsap.to(owner.state, { lens: 0, sheen: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      return false;
    }
    if (owner) this.detach(owner, true);
    this.attach(session);
    return true;
  }

  /** Atiende la petición en espera cuando el lienzo queda libre (o se agota la espera). */
  serveWaiting(now: number): void {
    const waiting = this.waiting;
    if (!waiting) return;
    if (!waiting.hovered) {
      this.waiting = null;
      return;
    }
    if (!this.owner || now - this.waitingSince > 350) {
      this.waiting = null;
      if (waiting.ready && this.request(waiting)) waiting.onAcquired();
    }
  }

  private attach(session: Session): void {
    const host = session.host;
    // Estado visible del CSS ANTES de congelarlo: el primer fotograma WebGL continúa exactamente desde ahí.
    session.syncFromCss();
    this.owner = session;
    this.fit(host);
    host.appendChild(this.canvas);
    this.observer?.observe(host);
    session.bg = backgroundOf(host);
    this.draw(session, performance.now());
    host.setAttribute('data-gl-active', '');
    releaseCssSwap(host);
  }

  /** Suelta el lienzo. Con `handoff`, la <img> retoma con CSS desde el punto exacto en que estaba la animación. */
  detach(session: Session, handoff: boolean): void {
    if (this.owner !== session) return;
    const host = session.host;
    if (handoff && session.mode === 'swap') session.handOffToCss();
    else host.removeAttribute('data-gl-active');
    this.observer?.unobserve(host);
    this.canvas.remove();
    this.owner = null;
    for (const texture of this.graveyard) this.gl?.deleteTexture(texture);
    this.graveyard.clear();
  }

  draw(session: Session, now: number): void {
    const gl = this.gl;
    if (!gl || !this.usable || this.owner !== session) return;
    const [front, back] = session.textures;
    if (!front) return;
    const width = this.boxWidth;
    const height = this.boxHeight;
    const state = session.state;
    const uniform = (name: (typeof UNIFORMS)[number]) => this.locations.get(name) ?? null;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, front.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, (back ?? front).texture);
    gl.uniform4fv(uniform('uCover0'), coverTransform(width, height, front.naturalWidth, front.naturalHeight));
    gl.uniform4fv(uniform('uCover1'), coverTransform(width, height, (back ?? front).naturalWidth, (back ?? front).naturalHeight));
    gl.uniform2f(uniform('uTexSize0'), front.width, front.height);
    gl.uniform2f(uniform('uTexSize1'), (back ?? front).width, (back ?? front).height);
    gl.uniform2f(uniform('uSize'), width, height);
    gl.uniform3fv(uniform('uBg'), session.bg);
    gl.uniform1f(uniform('uTime'), (now - this.startedAt) / 1000);
    gl.uniform1f(uniform('uOctaves'), this.software ? 3 : 4);
    gl.uniform1f(uniform('uProgress'), back ? state.progress : 0);
    gl.uniform1f(uniform('uPlain'), state.plain);
    gl.uniform2f(uniform('uOrigin'), session.origin[0], session.origin[1]);
    gl.uniform1f(uniform('uReach'), originReach(session.origin[0], session.origin[1], width / height));
    gl.uniform2f(uniform('uMouse'), state.mx, state.my);
    gl.uniform1f(uniform('uLens'), state.lens);
    gl.uniform1f(uniform('uRadius'), LENS_RADIUS);
    gl.uniform1f(uniform('uPress'), state.press);
    gl.uniform1f(uniform('uZoom'), state.zoom);
    gl.uniform1f(uniform('uSheen'), state.sheen);
    this.rippleData.fill(0);
    session.ripples.slice(-MAX_RIPPLES).forEach((ripple, index) => {
      const age = (now - ripple.birth) / 1000;
      this.rippleData.set([ripple.u, ripple.v, age, age < RIPPLE_LIFE ? ripple.amp : 0], index * 4);
    });
    gl.uniform4fv(uniform('uRipples'), this.rippleData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.draws += 1;
  }
}

let renderer: Renderer | null = null;

/** Renderizador compartido (null si no hay WebGL utilizable: se queda el CSS). */
function getRenderer(): Renderer | null {
  if (renderer) return renderer.usable || renderer.lost ? renderer : null;
  renderer = new Renderer();
  if (!renderer.init()) renderer.disabled = true;
  return renderer.usable ? renderer : null;
}

// ─── Sesión por caja de imagen ───────────────────────────────────────────

class Session {
  readonly state: HoverState = { progress: 0, plain: 0, lens: 0, press: 0, zoom: 1, sheen: 0, mx: 0.5, my: 0.5, rx: 0, ry: 0, lift: 1 };
  readonly config: (typeof MODES)[HoverMode];
  hovered = false;
  inside = false;
  ready = false;
  textures: TextureEntry[] = [];
  origin: [number, number] = [0.5, 0.5];
  ripples: Ripple[] = [];
  bg: [number, number, number] = STUDIO_BG;
  rect: Rect = { left: 0, top: 0, width: 1, height: 1 };
  private perspective = 1000;
  private lastPointer: { u: number; v: number; time: number } | null = null;
  private lastEmit = 0;
  private appliedTransform = '';
  private preparing = false;
  private quick: Record<'mx' | 'my' | 'rx' | 'ry', (value: number) => void>;

  constructor(
    readonly host: HTMLElement,
    readonly mode: HoverMode,
  ) {
    this.config = MODES[mode];
    this.quick = this.createQuickTo();
  }

  /** Seguimiento suavizado del puntero y de la inclinación (se recrea tras `killTweensOf`). */
  private createQuickTo(): Record<'mx' | 'my' | 'rx' | 'ry', (value: number) => void> {
    return {
      mx: gsap.quickTo(this.state, 'mx', { duration: 0.5, ease: 'power3.out' }),
      my: gsap.quickTo(this.state, 'my', { duration: 0.5, ease: 'power3.out' }),
      rx: gsap.quickTo(this.state, 'rx', { duration: 0.8, ease: 'power3.out' }),
      ry: gsap.quickTo(this.state, 'ry', { duration: 0.8, ease: 'power3.out' }),
    };
  }

  get hasBack(): boolean {
    return this.textures.length > 1;
  }

  get busy(): boolean {
    return gsap.isTweening(this.state) || this.ripples.length > 0;
  }

  enter(event: PointerEvent): void {
    const wasIdle = !live.has(this) && this.state.lens < 0.001 && Math.abs(this.state.rx) + Math.abs(this.state.ry) < 0.01;
    this.hovered = true;
    this.rect = layoutRect(this.host);
    this.perspective = perspectiveFor(this.rect.width, this.rect.height, this.config.perspective, this.config.perspectiveMin);
    const [u, v] = pointerToUv(event.clientX, event.clientY, this.rect);
    if (wasIdle) {
      // Sin "barrido" desde el centro: la lupa nace donde entra el cursor.
      this.state.mx = clamp01(u);
      this.state.my = clamp01(v);
    }
    if (this.state.progress < 0.001) this.origin = [clamp01(u), clamp01(v)];
    this.lastPointer = null;
    gsap.to(this.state, { sheen: 1, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(this.state, { zoom: this.config.zoom, duration: 1.1, ease: CSS_EASE_OUT, overwrite: 'auto' });
    gsap.to(this.state, { lift: this.config.lift, duration: 0.9, ease: CSS_EASE_OUT, overwrite: 'auto' });
    wake(this);
    void this.engage();
  }

  /** Prepara texturas y toma el lienzo; mientras tanto el CSS se queda quieto (máx. PENDING_MS) o hace su fundido. */
  private async engage(): Promise<void> {
    const r = getRenderer();
    if (!r) {
      releaseCssSwap(this.host);
      return;
    }
    const images = faces(this.host, this.mode);
    if (images.length === 0) return;
    const results = images.map((image) => r.texture(image, this.rect, this.config.zoom));
    const sync = results.every((result) => result !== null && !(result instanceof Promise));
    if (!sync) {
      if (this.mode === 'swap' && images.length > 1 && !this.host.hasAttribute('data-gl-pending') && r.owner !== this) holdCssSwap(this.host);
      if (this.preparing) return;
      this.preparing = true;
      const loaded = await Promise.all(results);
      this.preparing = false;
      if (loaded.some((entry) => !entry)) {
        releaseCssSwap(this.host);
        return;
      }
      this.textures = loaded as TextureEntry[];
    } else {
      this.textures = results as TextureEntry[];
    }
    this.ready = true;
    if (!this.hovered) {
      releaseCssSwap(this.host);
      return;
    }
    if (r.request(this)) this.onAcquired();
  }

  /** Ya con el lienzo: arranca la transición (si hay trasera) desde donde esté. */
  onAcquired(): void {
    if (!this.hovered) return;
    if (this.hasBack) this.animateSwap(1);
    wake(this);
  }

  private animateSwap(target: 0 | 1): void {
    const state = this.state;
    const plain = state.plain > 0.5;
    const duration = remainingDuration(state.progress, target, plain ? CSS_SWAP_DURATION : SWAP_DURATION, plain ? 0.2 : 0.35);
    if (duration === 0) return;
    gsap.to(state, {
      progress: target,
      duration,
      ease: plain ? CSS_EASE_OUT : LIQUID_EASE,
      overwrite: 'auto',
      onComplete: () => {
        // En los extremos ambos modos coinciden: la siguiente transición ya es líquida.
        state.plain = 0;
      },
    });
  }

  /**
   * `target`: elemento bajo el cursor. Sobre los controles que hay dentro de la caja (añadido rápido,
   * favoritos) la caja se queda quieta y sin lupa para que se lean y se pulsen bien; fuera de la imagen, igual.
   */
  move(clientX: number, clientY: number, time: number, target?: EventTarget | null): void {
    this.rect = layoutRect(this.host);
    const [u, v] = pointerToUv(clientX, clientY, this.rect);
    // Solo cuentan los controles DENTRO de la caja (en la ficha, la propia diapositiva es un <button> que la envuelve).
    const control = target instanceof Element ? target.closest(CALM_SELECTOR) : null;
    const overControl = control !== null && control !== this.host && this.host.contains(control);
    const inside = insideUv(u, v) && !overControl;
    this.quick.mx(clamp01(u));
    this.quick.my(clamp01(v));
    const { rx, ry } = inside ? tiltAngles(u, v, this.config.tilt) : { rx: 0, ry: 0 };
    this.quick.rx(rx);
    this.quick.ry(ry);
    if (inside !== this.inside) {
      this.inside = inside;
      gsap.to(this.state, { lens: inside ? 1 : 0, duration: inside ? 0.6 : 0.4, ease: 'power3.out', overwrite: 'auto' });
    }
    // Estela: velocidad en anchos de caja por segundo.
    const last = this.lastPointer;
    if (last && inside && time > last.time) {
      const aspect = this.rect.height / this.rect.width;
      const speed = Math.hypot(u - last.u, (v - last.v) * aspect) / ((time - last.time) / 1000);
      const amp = rippleAmplitude(speed);
      if (amp > 0 && time - this.lastEmit > 45) {
        this.lastEmit = time;
        this.ripples.push({ u, v, birth: performance.now(), amp });
        if (this.ripples.length > MAX_RIPPLES) this.ripples.shift();
      }
    }
    this.lastPointer = { u, v, time };
    wake(this);
  }

  leave(clientX?: number, clientY?: number): void {
    if (!this.hovered) return;
    this.hovered = false;
    this.inside = false;
    releaseCssSwap(this.host);
    const state = this.state;
    gsap.to(state, { lens: 0, sheen: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
    if (state.press > 0) gsap.to(state, { press: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(state, { zoom: 1, lift: 1, duration: SWAP_DURATION, ease: CSS_EASE_OUT, overwrite: 'auto' });
    this.quick.rx(0);
    this.quick.ry(0);
    if (this.hasBack && renderer?.owner === this) {
      // Totalmente en la trasera: la vuelta nace donde sale el cursor. A mitad: invierte desde donde está.
      if (state.progress > 0.999 && clientX !== undefined && clientY !== undefined) {
        const [u, v] = pointerToUv(clientX, clientY, layoutRect(this.host));
        this.origin = [clamp01(u), clamp01(v)];
      }
      this.animateSwap(0);
    }
    wake(this);
  }

  press(down: boolean): void {
    if (!this.config.press || !this.hovered) return;
    gsap.to(this.state, down
      ? { press: 1, duration: 0.12, ease: 'power2.out', overwrite: 'auto' }
      : { press: 0, duration: 0.9, ease: 'elastic.out(1, 0.32)', overwrite: 'auto' });
    wake(this);
  }

  /** Lee del CSS el punto visible del fundido y del zoom (relevo sin saltos). */
  syncFromCss(): void {
    if (this.mode !== 'swap') return;
    const [front, back] = faces(this.host, this.mode);
    if (front) {
      this.state.zoom = parseCssScale(getComputedStyle(front).transform);
      const target = this.hovered ? this.config.zoom : 1;
      gsap.to(this.state, { zoom: target, duration: Math.abs(target - this.state.zoom) < 1e-4 ? 0 : 0.8, ease: CSS_EASE_OUT, overwrite: 'auto' });
    }
    if (back) {
      const opacity = Number.parseFloat(getComputedStyle(back).opacity) || 0;
      // El CSS ya había empezado su fundido: se termina como fundido (en los extremos se vuelve líquido).
      if (opacity > 0.04 && opacity < 0.999) {
        this.state.progress = opacity;
        this.state.plain = 1;
      } else if (opacity >= 0.999) {
        this.state.progress = 1;
        this.state.plain = 0;
      }
    }
  }

  /** Devuelve las <img> al CSS exactamente en el estado que mostraba el lienzo; sus transiciones siguen desde ahí. */
  handOffToCss(): void {
    const [front, back] = faces(this.host, this.mode);
    const layers = [front, back].filter((layer): layer is HTMLImageElement => Boolean(layer));
    const zoom = this.state.zoom;
    for (const layer of layers) {
      layer.style.transition = 'none';
      layer.style.transform = `scale(${zoom.toFixed(4)})`;
    }
    if (back && this.hasBack) back.style.opacity = String(this.state.progress);
    this.host.removeAttribute('data-gl-active');
    void this.host.offsetWidth; // fija el estilo intermedio antes de devolver el control a las transiciones
    for (const layer of layers) {
      layer.style.removeProperty('transition');
      layer.style.removeProperty('transform');
    }
    back?.style.removeProperty('opacity');
    this.state.plain = 0;
  }

  pruneRipples(now: number): void {
    if (this.ripples.length === 0) return;
    this.ripples = this.ripples.filter((ripple) => (now - ripple.birth) / 1000 < RIPPLE_LIFE);
  }

  /** Aplica la inclinación (y el realce en modo ficha) a la caja; solo escribe si cambió. */
  applyTransform(): void {
    const { rx, ry, lift } = this.state;
    const resting = Math.abs(rx) < 0.005 && Math.abs(ry) < 0.005 && Math.abs(lift - 1) < 1e-4;
    const value = resting
      ? ''
      : `perspective(${this.perspective}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)${lift !== 1 ? ` scale(${lift.toFixed(4)})` : ''}`;
    if (value === this.appliedTransform) return;
    this.appliedTransform = value;
    if (value) this.host.style.transform = value;
    else this.host.style.removeProperty('transform');
  }

  /** Reposo tras salir: suelta el lienzo (el CSS ya está en reposo, así que no hay salto) y limpia el transform. */
  settle(): void {
    if (renderer?.owner === this) renderer.detach(this, false);
    this.applyTransform();
  }

  /** Corta todo al instante (pestaña oculta, desmontaje). */
  reset(): void {
    gsap.killTweensOf(this.state);
    this.hovered = false;
    this.inside = false;
    if (renderer?.owner === this) renderer.detach(this, true);
    Object.assign(this.state, { progress: 0, plain: 0, lens: 0, press: 0, zoom: 1, sheen: 0, rx: 0, ry: 0, lift: 1 });
    this.quick = this.createQuickTo();
    this.ripples = [];
    this.applyTransform();
    releaseCssSwap(this.host);
    live.delete(this);
  }
}

// ─── Bucle: solo con hover o animación en curso ──────────────────────────

const live = new Set<Session>();
let ticking = false;
let lastTick = 0;
let drewLastFrame = false;
/** Duración de fotogramas en los que pintamos y en los que no (referencia del coste del resto de la página). */
const drawnDeltas: number[] = [];
const ambientDeltas: number[] = [];

function wake(session: Session): void {
  live.add(session);
  if (ticking || document.hidden) return;
  ticking = true;
  lastTick = performance.now();
  gsap.ticker.add(tick);
}

function sleep(): void {
  if (!ticking) return;
  ticking = false;
  gsap.ticker.remove(tick);
}

function tick(): void {
  const now = performance.now();
  const r = renderer;
  watchdog(now - lastTick, drewLastFrame);
  lastTick = now;
  drewLastFrame = false;
  for (const session of live) {
    session.pruneRipples(now);
    session.applyTransform();
    const busy = session.busy;
    if (r?.owner === session && (busy || session.hovered)) {
      r.draw(session, now);
      drewLastFrame = true;
    }
    if (!busy) {
      live.delete(session);
      if (!session.hovered) session.settle();
    }
  }
  r?.serveWaiting(now);
  if (live.size === 0 && !r?.waiting) sleep();
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1];

/**
 * Vigilante de coste RELATIVO: si los fotogramas en los que pintamos van claramente más lentos que el resto
 * (< 25 fps y 1,6× la referencia), la GPU no llega: se apaga el efecto y vuelve el CSS. Comparar con la
 * referencia evita culpar al lienzo cuando toda la página va lenta por otras razones.
 */
function watchdog(delta: number, drew: boolean): void {
  if (delta > 250) return; // pausas puntuales (GC, capturas, cambio de pestaña) no cuentan
  const bucket = drew ? drawnDeltas : ambientDeltas;
  bucket.push(delta);
  if (bucket.length > 40) bucket.shift();
  const r = renderer;
  if (!r?.owner || drawnDeltas.length < 30 || ambientDeltas.length < 8) return;
  const drawn = median(drawnDeltas);
  if (drawn > 40 && drawn > median(ambientDeltas) * 1.6) {
    if (import.meta.env.DEV) console.info(`[product-hover] desactivado: ${drawn.toFixed(1)} ms por fotograma con WebGL`);
    r.disabled = true;
    const owner = r.owner;
    r.detach(owner, true);
    owner.reset();
  }
}

/** Referencia inicial del coste de un fotograma sin el lienzo (unos pocos fotogramas al cargar el chunk). */
function sampleAmbient(frames = 12): void {
  let last = performance.now();
  const step = (time: number) => {
    if (!renderer?.owner && time - last < 250) ambientDeltas.push(time - last);
    last = time;
    if (--frames > 0 && !document.hidden) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
sampleAmbient();

// Solo en desarrollo: estado legible desde la consola o desde las sondas de Playwright.
if (import.meta.env.DEV) {
  Object.assign(window, {
    __productHoverGL: {
      get renderer() {
        return renderer && { webgl2: renderer.webgl2, software: renderer.software, disabled: renderer.disabled, lost: renderer.lost, textures: renderer.textures.size, draws: renderer.draws, ticking };
      },
      get owner() {
        const owner = renderer?.owner;
        return owner && { mode: owner.mode, hovered: owner.hovered, inside: owner.inside, state: Object.fromEntries(Object.entries(owner.state).filter(([, value]) => typeof value === 'number').map(([key, value]) => [key, +value.toFixed(3)])), ripples: owner.ripples.length };
      },
    },
  });
}

// Pestaña oculta: no se pinta nada. Lo que estaba saliendo termina en reposo al instante; el hover en
// curso se conserva (al volver, el siguiente movimiento del puntero lo continúa o lo cierra).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    for (const session of [...live]) if (!session.hovered) session.reset();
    sleep();
    return;
  }
  const first = live.values().next().value;
  if (first) wake(first);
});

// ─── Enganche a un contenedor ────────────────────────────────────────────

const sessions = new WeakMap<HTMLElement, Session>();

function sessionFor(host: HTMLElement, mode: HoverMode): Session {
  let session = sessions.get(host);
  if (!session || session.mode !== mode) {
    session = new Session(host, mode);
    sessions.set(host, session);
  }
  return session;
}

/**
 * Engancha la capa a `root`. Modo `swap`: el hover de `root` (la tarjeta) gobierna su única caja
 * `[data-product-media]`. Modo `lens`: cada caja `[data-product-media]` de dentro responde por separado.
 * Devuelve la función de desmontaje.
 */
export function attach(root: HTMLElement, { mode, initialEvent }: AttachOptions): () => void {
  let active: Session | null = null;
  let lastClient: { x: number; y: number } | null = null;

  const enabled = () => !prefersReducedMotion() && hasFinePointer() && !(renderer?.disabled ?? false);

  const resolveHost = (event: PointerEvent): HTMLElement | null => {
    if (mode === 'swap') return root.querySelector<HTMLElement>(MEDIA_SELECTOR);
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(MEDIA_SELECTOR) : null;
    return target && root.contains(target) ? target : null;
  };

  const onPointer = (event: PointerEvent) => {
    if (!isHoverPointer(event)) return;
    lastClient = { x: event.clientX, y: event.clientY };
    if (!enabled()) {
      if (active) active.reset();
      active = null;
      return;
    }
    const host = resolveHost(event);
    if (host !== active?.host) {
      active?.leave(event.clientX, event.clientY);
      active = host ? sessionFor(host, mode) : null;
      active?.enter(event);
    }
    active?.move(event.clientX, event.clientY, event.timeStamp, event.target);
  };

  const onLeave = (event: PointerEvent) => {
    active?.leave(event.clientX, event.clientY);
    active = null;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button === 0 && isHoverPointer(event)) active?.press(true);
  };
  const onUp = () => active?.press(false);

  // Con scroll el puntero no se mueve pero la imagen sí: se recalcula su posición relativa.
  const onScroll = () => {
    if (active?.hovered && lastClient) active.move(lastClient.x, lastClient.y, performance.now());
  };

  // Otra <img> (cambio de color con la tarjeta bajo el cursor): se vuelven a preparar las texturas.
  const onLoad = (event: Event) => {
    if (!(event.target instanceof HTMLImageElement) || !active?.hovered || !active.host.contains(event.target)) return;
    const session = active;
    if (renderer?.owner === session) renderer.detach(session, true);
    session.ready = false;
    session.leave();
    if (lastClient) {
      session.enter(new PointerEvent('pointerover', { clientX: lastClient.x, clientY: lastClient.y, pointerType: 'mouse' }));
    }
  };

  root.addEventListener('pointerover', onPointer);
  root.addEventListener('pointermove', onPointer);
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  root.addEventListener('load', onLoad, true);
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });

  // El evento que provocó la carga: solo si el cursor sigue encima.
  if (initialEvent && root.matches(':hover')) onPointer(initialEvent);

  return () => {
    root.removeEventListener('pointerover', onPointer);
    root.removeEventListener('pointermove', onPointer);
    root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onUp);
    root.removeEventListener('load', onLoad, true);
    window.removeEventListener('scroll', onScroll, { capture: true });
    active?.reset();
    active = null;
  };
}
