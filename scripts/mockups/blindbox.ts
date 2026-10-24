/**
 * Fotos virtuales de las blind boxes de HYPO (categoría 3D).
 *
 * 1. Gráfica del packaging: cada cara de la caja se compone en HTML/CSS con las marcas oficiales
 *    (logotipo, mascota, monograma, estrella) y las tipografías de la web, y Chromium la rasteriza.
 * 2. Render físico: una escena three.js en Chromium (WebGL por SwiftShader en local) con la caja de
 *    cartón de cantos redondeados, material de cartón laminado (grano, rugosidad y barniz suave),
 *    iluminación de estudio (entorno + luz principal + contraluz) y sombras suaves de contacto.
 *
 * Tres vistas por color: frente en tres cuartos, espalda y detalle del frente.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import type { Product } from '../../shared/types';
import { VECTORS, type Mark } from './raster';

const ROOT = resolve('node_modules');
const ORIGIN = 'http://blindbox.local';

/** Medidas de la caja (cm): ancho, alto y fondo. */
const BOX = { w: 6.5, h: 9, d: 6.5 };
/** Píxeles de textura por centímetro. */
const PX = 200;

interface Palette {
  bg: string;
  ink: string;
  accent: string;
  sub: string;
  /** Borde troquelado de la mascota (null = sin borde). */
  border: string | null;
  /** Marca que hay detrás de la mascota en el frente. */
  hero: 'question' | 'star';
  serie: string;
  code: string;
}

function palette(product: Product, colorId: string): Palette {
  const code = product.code;
  // Paleta de marca: Coffee Bean #0a0a0a, Racing Red #e90c17, White #ffffff (el cartón blanco es blanco impreso).
  if (product.id === 'p-blindbox-signal') {
    return { bg: '#e90c17', ink: '#ffffff', accent: '#0a0a0a', sub: 'rgba(10,10,10,0.62)', border: '#ffffff', hero: 'star', serie: 'SIGNAL', code };
  }
  if (colorId === 'blanco') {
    return { bg: '#f4f1f0', ink: '#0a0a0a', accent: '#e90c17', sub: 'rgba(10,10,10,0.55)', border: null, hero: 'question', serie: 'SERIE 01', code };
  }
  return { bg: '#0a0a0a', ink: '#ffffff', accent: '#e90c17', sub: 'rgba(255,255,255,0.55)', border: '#ffffff', hero: 'question', serie: 'SERIE 01', code };
}

// ─── Gráfica de las caras ───────────────────────────────────────────────────

function mark(name: Mark, color: string, width: number, style = ''): string {
  const v = VECTORS[name];
  return `<svg viewBox="${v.viewBox}" width="${width}" style="display:block;${style}" xmlns="http://www.w3.org/2000/svg"><g transform="${v.transform}"><path d="${v.d}" fill="${color}"/></g></svg>`;
}

/** Mascota como en la web (silueta negra + trazo claro), con borde troquelado opcional. */
function mascot(width: number, p: Palette, style = ''): string {
  const v = VECTORS.mascot as typeof VECTORS.mascot & { fill: string };
  const border = p.border ? `<path d="${v.fill}" fill="none" stroke="${p.border}" stroke-width="150" stroke-linejoin="round"/>` : '';
  return `<svg viewBox="-60 -60 ${v.width + 120} ${v.height + 120}" width="${width}" style="display:block;overflow:visible;${style}" xmlns="http://www.w3.org/2000/svg"><g transform="${v.transform}">${border}<path d="${v.fill}" fill="#0a0a0a"/><path d="${v.d}" fill="#ffffff"/></g></svg>`;
}

/*
 * Una sola familia, la de la marca: Bastaman (solo mayúsculas, sin ¿ ¡ ·). El ¿ se compone con un
 * «?» girado 180° y los separadores son barras. Aerosoldier no se usa en el packaging: la versión
 * disponible es de uso personal.
 */
const FONTS = `
@font-face{font-family:Bastaman;src:url(${ORIGIN}/fonts/bastaman.woff2) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
.face{position:relative;overflow:hidden;font-family:Bastaman;font-synthesis:none}
.mono{letter-spacing:.08em;text-transform:uppercase}
.crushed{text-transform:uppercase;line-height:.86;letter-spacing:-.03em}
.wide{text-transform:uppercase;letter-spacing:-.02em;line-height:.9}
.inv{display:inline-block;transform:rotate(180deg)}
`;

type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

function faceSize(face: Face): [number, number] {
  if (face === 'left' || face === 'right') return [BOX.d * PX, BOX.h * PX];
  if (face === 'top' || face === 'bottom') return [BOX.w * PX, BOX.d * PX];
  return [BOX.w * PX, BOX.h * PX];
}

function faceHTML(face: Face, p: Palette): string {
  const [w, h] = faceSize(face);
  const base = `width:${w}px;height:${h}px;background:${p.bg};color:${p.ink}`;
  // Trabilla roja tejida, la firma de la marca, en el canto derecho del frente.
  const tab = `<div style="position:absolute;right:0;top:${h * 0.72}px;width:44px;height:120px;background:${p.hero === 'star' ? '#0a0a0a' : '#e90c17'};box-shadow:inset 0 0 0 3px rgba(0,0,0,.12)"></div>`;
  if (face === 'front') {
    const heroMark =
      p.hero === 'star'
        ? `<div style="position:absolute;left:50%;top:610px;transform:translate(-50%,-50%) rotate(-8deg)">${mark('star', p.accent, 1180)}</div>`
        : `<div class="crushed" style="position:absolute;left:50%;top:330px;transform:translateX(-50%);font-size:1180px;line-height:.78;color:${p.accent}">?</div>`;
    return `<div class="face" style="${base}">
      <div class="mono" style="position:absolute;left:70px;top:64px;font-size:34px;color:${p.sub}">${p.code}</div>
      <div class="mono" style="position:absolute;right:70px;top:64px;font-size:34px;color:${p.sub}">${p.serie}</div>
      <div style="position:absolute;left:50%;top:150px;transform:translateX(-50%)">${mark('wordmark', p.ink, 640)}</div>
      ${heroMark}
      <div style="position:absolute;left:50%;top:640px;transform:translateX(-50%) rotate(-6deg)">${mascot(700, p)}</div>
      <div class="crushed" style="position:absolute;left:0;right:0;top:1340px;text-align:center;font-size:188px">Blind box</div>
      <div class="mono" style="position:absolute;left:0;right:0;top:1600px;text-align:center;font-size:36px;color:${p.sub}">1 figura sorpresa / vinilo</div>
      ${tab}
    </div>`;
  }
  if (face === 'right') {
    const ghost = (x: number, y: number, r: number) =>
      `<div style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${r}deg);opacity:.9">${mark('mascot', p.sub, 340)}<div class="crushed" style="position:absolute;inset:0;display:grid;place-items:center;font-size:260px;color:${p.accent}">?</div></div>`;
    return `<div class="face" style="${base}">
      <div class="crushed" style="position:absolute;left:0;right:0;top:140px;text-align:center;font-size:168px;line-height:.92"><span class="inv">?</span>Cuál<br/>te toca?</div>
      ${ghost(150, 640, -6)}${ghost(800, 640, 7)}${ghost(475, 1020, -3)}
      <div class="mono" style="position:absolute;left:0;right:0;top:1520px;text-align:center;font-size:36px;color:${p.sub}">Abre la caja para descubrirlo</div>
    </div>`;
  }
  if (face === 'left') {
    return `<div class="face" style="${base}">
      <div style="position:absolute;left:50%;top:150px;transform:translateX(-50%)">${mark('monogram', p.accent, 240)}</div>
      <div class="crushed" style="position:absolute;left:50%;top:1000px;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;font-size:168px;text-align:left">Built for<br/>the climb.</div>
    </div>`;
  }
  if (face === 'back') {
    return `<div class="face" style="${base}">
      <div style="position:absolute;left:50%;top:130px;transform:translateX(-50%)">${mark('wordmark', p.ink, 520)}</div>
      <div style="position:absolute;left:50%;top:420px;transform:translateX(-50%);opacity:.16">${mark('monogram', p.ink, 900)}</div>
      <div class="wide" style="position:absolute;left:90px;right:90px;top:820px;font-size:112px">HYPO<br/>${p.serie}</div>
      <div class="mono" style="position:absolute;left:90px;right:90px;top:1180px;font-size:34px;line-height:1.55;color:${p.sub}">
        Contiene 1 figura de vinilo sorpresa.<br/>No apto para menores de 3 años:<br/>contiene piezas pequeñas.<br/><br/>Producto de demostración / HYPSOS
      </div>
      ${tab}
    </div>`;
  }
  if (face === 'top') {
    return `<div class="face" style="${base}">
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${mark('monogram', p.accent, 560)}</div>
      <div class="mono" style="position:absolute;left:0;right:0;bottom:110px;text-align:center;font-size:40px;color:${p.sub}">${p.serie} / HYPO</div>
    </div>`;
  }
  return `<div class="face" style="${base}"></div>`;
}

// ─── Escena three.js ────────────────────────────────────────────────────────

const SCENE = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:radial-gradient(120% 90% at 40% 30%,#f3f1ec 0%,#e8e4dc 55%,#d9d4ca 100%)}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"${ORIGIN}/three/build/three.module.js","three/addons/":"${ORIGIN}/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

window.renderBox = async ({ width, height, faces, view, bg }) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  document.body.innerHTML = '';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // Grano del cartón: ruido fino como relieve y como variación de brillo.
  const grain = document.createElement('canvas');
  grain.width = grain.height = 512;
  const g = grain.getContext('2d');
  const img = g.createImageData(512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 20 + (Math.random() < 0.02 ? 30 : 0);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const grainTex = new THREE.CanvasTexture(grain);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.repeat.set(3, 4);

  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((ok) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; ok(t); }));
  // Orden de grupos de BoxGeometry: +x (derecha), -x (izquierda), +y (tapa), -y (base), +z (frente), -z (espalda).
  const order = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  const maps = await Promise.all(order.map((f) => load(faces[f])));
  const materials = maps.map((map) => new THREE.MeshPhysicalMaterial({
    map, roughness: 0.5, roughnessMap: grainTex, bumpMap: grainTex, bumpScale: 0.35,
    clearcoat: 0.22, clearcoatRoughness: 0.4, sheen: 0.15, sheenRoughness: 0.8,
  }));

  const W = ${BOX.w}, H = ${BOX.h}, D = ${BOX.d};
  const box = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.07), materials);
  box.position.y = H / 2;
  box.rotation.y = view.rotation;
  box.castShadow = true;
  scene.add(box);

  // Suelo: solo recibe la sombra; el fondo de estudio lo pinta el CSS de la página.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Sombra de contacto: halo oscuro y difuso justo bajo la caja.
  const contact = document.createElement('canvas');
  contact.width = contact.height = 256;
  const c = contact.getContext('2d');
  const grad = c.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 256, 256);
  const contactMesh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, D * 1.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(contact), transparent: true, depthWrite: false }));
  contactMesh.rotation.x = -Math.PI / 2;
  contactMesh.rotation.z = view.rotation;
  contactMesh.position.y = 0.01;
  scene.add(contactMesh);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-9, 16, 11);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 14;
  key.shadow.blurSamples = 24;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff4ea, 1.1);
  rim.position.set(10, 9, -9);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe8eeff, 0.35);
  fill.position.set(8, 4, 12);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.1, 200);
  camera.position.set(...view.camera);
  camera.lookAt(...view.target);
  renderer.render(scene, camera);
  return true;
};
window.ready = true;
</script></body></html>`;

// ─── Navegador ──────────────────────────────────────────────────────────────

let browser: Browser | undefined;
let page: Page | undefined;
/** HTML de la cara que se está rasterizando (se sirve como /face.html, mismo origen que las fuentes). */
let currentFace = '';

async function getPage(): Promise<Page> {
  if (page) return page;
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  page = await browser.newPage({ viewport: { width: 1300, height: 1800 }, deviceScaleFactor: 1 });
  const files: Record<string, string> = {
    '/fonts/bastaman.woff2': resolve('src/assets/fonts/bastaman.woff2'),
  };
  const textures = new Map<string, Buffer>();
  (page as Page & { textures?: Map<string, Buffer> }).textures = textures;
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/scene.html') return route.fulfill({ contentType: 'text/html', body: SCENE });
    if (path === '/face.html') return route.fulfill({ contentType: 'text/html', body: currentFace });
    if (path.startsWith('/tex/')) return route.fulfill({ contentType: 'image/png', body: textures.get(path) ?? Buffer.alloc(0) });
    if (path.startsWith('/three/')) return route.fulfill({ contentType: 'text/javascript', body: readFileSync(join(ROOT, path)) });
    if (files[path]) return route.fulfill({ contentType: 'font/woff2', body: readFileSync(files[path]) });
    return route.fulfill({ status: 404, body: '' });
  });
  return page;
}

export async function closeBlindboxBrowser() {
  await browser?.close();
  browser = undefined;
  page = undefined;
}

async function rasterFace(p: Page, face: Face, pal: Palette): Promise<Buffer> {
  const [w, h] = faceSize(face);
  await p.setViewportSize({ width: w, height: h });
  currentFace = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}</style></head><body>${faceHTML(face, pal)}</body></html>`;
  await p.goto(`${ORIGIN}/face.html`, { waitUntil: 'load' });
  await p.evaluate(async () => {
    await document.fonts.ready;
  });
  return p.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
}

export interface BlindboxShots {
  front: Buffer;
  back: Buffer;
  detail: Buffer;
}

const VIEWS = {
  front: { rotation: -0.62, fov: 24, camera: [0, 9.2, 33] as const, target: [0, 4.3, 0] as const },
  back: { rotation: Math.PI - 0.62, fov: 24, camera: [0, 9.2, 33] as const, target: [0, 4.3, 0] as const },
  detail: { rotation: -0.36, fov: 15, camera: [-1.4, 8.6, 30] as const, target: [-0.9, 5.6, 0] as const },
};

/** Renderiza las tres vistas de una blind box a 1920×2400 (4:5). */
export async function blindboxShots(product: Product, colorId: string): Promise<BlindboxShots> {
  const p = await getPage();
  const pal = palette(product, colorId);
  const textures = (p as Page & { textures: Map<string, Buffer> }).textures;
  const faces: Record<string, string> = {};
  for (const face of ['front', 'back', 'left', 'right', 'top', 'bottom'] as Face[]) {
    const key = `/tex/${product.id}-${colorId}-${face}.png`;
    textures.set(key, await rasterFace(p, face, pal));
    faces[face] = `${ORIGIN}${key}`;
  }
  const width = 1920;
  const height = 2400;
  await p.setViewportSize({ width, height });
  await p.goto(`${ORIGIN}/scene.html`);
  await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  const out = {} as BlindboxShots;
  for (const view of ['front', 'back', 'detail'] as const) {
    await p.evaluate((args) => (window as unknown as { renderBox: (a: unknown) => Promise<boolean> }).renderBox(args), { width, height, faces, view: VIEWS[view] });
    out[view] = await p.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  }
  return out;
}
