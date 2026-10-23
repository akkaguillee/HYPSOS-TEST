/**
 * Productos con forma de marca (llavero, figura, monograma de escritorio y stickers): no tienen
 * foto de base, así que se fotografían «en virtual» con filtros SVG de Chromium sobre el mismo
 * fondo de estudio que las prendas. La silueta es siempre la marca oficial, sin redibujar: solo se
 * escala, se gira, se extruye (copias desplazadas) y se ilumina.
 *
 * - Llavero: PVC de tacto suave (goma mate, cantos redondeados, ≈4 mm), anilla de acero mate.
 * - Figura y monograma: resina mate / lacado satinado con sombreado suave.
 * - Stickers: vinilo troquelado con borde blanco, canto fino, brillo leve y una esquina levantada.
 *
 * Todo se compone en un lienzo de 960×1200 y se rasteriza al doble (1920×2400) para poder recortar
 * la vista de detalle sin reescalar.
 */
import type { Product } from '../../shared/types';
import { markAspect, svgToPng, VECTORS, type Mark } from './raster';
import { SCALE } from './photo';

export const OBJECT_SILHOUETTES = new Set(['keychain', 'figure', 'object', 'sticker']);

const W = 960;
const H = 1200;
type Side = 'front' | 'back';
type Box = [number, number, number, number];

/** Marca oficial colocada en (x, y) con ancho w (el alto respeta su proporción). */
function markAt(mark: Mark, x: number, y: number, w: number, paths: string, mirrored = false) {
  const v = VECTORS[mark];
  const h = w * markAspect(mark);
  // El reflejo (vista trasera) va dentro de la marca: los filtros de luz nunca reciben una escala negativa.
  const flip = mirrored ? `translate(${v.width} 0) scale(-1 1) ` : '';
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${v.viewBox}" overflow="visible"><g transform="${flip}${v.transform}">${paths}</g></svg>`;
}
const path = (mark: Mark, fill: string, layer: 'd' | 'fill' = 'd') =>
  `<path d="${layer === 'fill' ? VECTORS.mascot.fill : VECTORS[mark].d}" fill="${fill}"/>`;

/** Fondo de estudio: el mismo blanco roto cálido de las fotos, con caída de luz y grano. */
const STUDIO = `
<radialGradient id="sweep" cx="46%" cy="38%" r="80%">
  <stop offset="0" stop-color="#efece7"/><stop offset="0.65" stop-color="#e9e6e0"/><stop offset="1" stop-color="#dfdcd5"/>
</radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.05 0"/>
</filter>`;
const studio = () => `<rect width="${W}" height="${H}" fill="url(#sweep)"/>`;
const grain = () => `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.9" style="mix-blend-mode:overlay"/>`;

/**
 * Iluminación de un volumen: el alfa desenfocado hace de mapa de alturas; luz difusa (multiplica)
 * y especular baja (suma), recortadas a la silueta. `soft` = radio del canto, `gloss` = brillo.
 */
function litFilter(id: string, o: { soft: number; height: number; gloss: number; exponent: number; ambient?: number }) {
  const amb = o.ambient ?? 0.35;
  return `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${o.soft}" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="${o.height}" diffuseConstant="1" lighting-color="#ffffff" result="d"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>
  <feComponentTransfer in="d" result="dd"><feFuncR type="linear" slope="${1 - amb}" intercept="${amb}"/><feFuncG type="linear" slope="${1 - amb}" intercept="${amb}"/><feFuncB type="linear" slope="${1 - amb}" intercept="${amb}"/></feComponentTransfer>
  <feComposite in="SourceGraphic" in2="dd" operator="arithmetic" k1="1.18" k2="0" k3="0" k4="0" result="lit"/>
  <feSpecularLighting in="h" surfaceScale="${o.height}" specularConstant="${o.gloss}" specularExponent="${o.exponent}" lighting-color="#fffdf8" result="s"><feDistantLight azimuth="225" elevation="52"/></feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="sIn"/>
  <feComposite in="lit" in2="sIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="out"/>
  <feComposite in="out" in2="SourceAlpha" operator="in"/>
</filter>`;
}

/** Sombra de suelo (amplia y suave) + sombra de contacto (corta y densa). */
function shadowFilter(id: string, o: { blur: number; dx: number; dy: number; opacity: number; contact?: number }) {
  return `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${o.blur}" result="b"/><feOffset in="b" dx="${o.dx}" dy="${o.dy}" result="o"/>
  <feFlood flood-color="#2a241d" flood-opacity="${o.opacity}"/><feComposite in2="o" operator="in" result="soft"/>
  <feGaussianBlur in="SourceAlpha" stdDeviation="${(o.blur / 6).toFixed(2)}" result="cb"/><feOffset in="cb" dx="${(o.dx / 5).toFixed(2)}" dy="${(o.dy / 5).toFixed(2)}" result="co"/>
  <feFlood flood-color="#1d1915" flood-opacity="${o.contact ?? 0.35}"/><feComposite in2="co" operator="in" result="hard"/>
  <feMerge><feMergeNode in="soft"/><feMergeNode in="hard"/></feMerge>
</filter>`;
}

// ─── Llavero ────────────────────────────────────────────────────────────────

function keychain(colorId: string, side: Side): { svg: string; detail: Box } {
  // PVC teñido en masa: la cara y el canto son del mismo color; el canto, en sombra.
  const rubber = colorId === 'rojo' ? '#b0192d' : '#202021';
  const sideTone = colorId === 'rojo' ? '#6e0f1b' : '#0e0e0f';
  const back = side === 'back';
  // La vista trasera es la misma composición reflejada respecto al centro del lienzo.
  const w = 540;
  const h = w * markAspect('monogram');
  const x = back ? W - 290 - w : 290;
  const y = 430;
  // El brazo fino izquierdo del monograma acaba en (x, y + 0,52·h): la argolla lo rodea cerca de la punta.
  const s = back ? -1 : 1;
  const tipX = back ? x + w - 0.06 * w : x + 0.06 * w;
  const tipY = y + 0.515 * h;
  const r = 84;
  const ringX = tipX - s * r * 0.72;
  const ringY = tipY - r * 0.7;
  const H = (fill: string, dx = 0, dy = 0) => `<g transform="translate(${dx} ${dy})">${markAt('monogram', x, y, w, path('monogram', fill), back)}</g>`;
  // Canto de goma (≈4 mm): copias hacia abajo, del fondo (más oscuro) a la cara.
  let edge = '';
  for (let k = 9; k >= 1; k--) edge += H(mix(rubber, sideTone, 0.35 + (0.65 * k) / 9), 0.6 * s * k, k);
  // Cara: goma mate con el canto muy redondeado (mapa de alturas amplio), brillo apenas satinado y micro-grano.
  const face = `<g filter="url(#rubberLit)">${H(rubber)}</g><g filter="url(#rubberTexture)">${H('#808080')}</g>`;
  const steel = (d: string, width: number) => `<path d="${d}" fill="none" stroke="url(#steel)" stroke-width="${width}" stroke-linecap="round"/>`;
  // Argolla: mitad trasera bajo la pieza, mitad delantera encima.
  const jr = 21;
  const jx = tipX - 8 * s;
  const sweep = back ? 1 : 0;
  const jumpBack = `<g filter="url(#steelLit)">${steel(`M${jx},${tipY - jr} A${jr * 0.7},${jr} 0 0,${sweep} ${jx},${tipY + jr}`, 6)}</g>`;
  const jumpFront = `<g filter="url(#steelLit)">${steel(`M${jx},${tipY + jr} A${jr * 0.75},${jr} 0 0,${sweep} ${jx},${tipY - jr}`, 6)}</g>`;
  // Anilla partida de dos espiras, acero mate (no cromado).
  const ring =
    `<g filter="url(#steelLit)">` +
    `<ellipse cx="${ringX}" cy="${ringY}" rx="${r}" ry="${r * 0.94}" fill="none" stroke="url(#steel)" stroke-width="8"/>` +
    `<path d="M${ringX + s * r * 0.97},${ringY + 10} A${r - 3},${r * 0.94 - 3} 0 1,${back ? 0 : 1} ${ringX + s * r * 0.5},${ringY - r * 0.8}" fill="none" stroke="url(#steel)" stroke-width="6.5" transform="translate(${2 * s} 3)"/>` +
    `</g>`;
  const shadow = `<g filter="url(#ground)">${H('#000')}<ellipse cx="${ringX}" cy="${ringY}" rx="${r}" ry="${r * 0.94}" fill="none" stroke="#000" stroke-width="9"/></g>`;
  const defs = `${litFilter('rubberLit', { soft: 6, height: 6, gloss: colorId === 'rojo' ? 0.07 : 0.09, exponent: 5, ambient: 0.5 })}
${litFilter('steelLit', { soft: 1.6, height: 3, gloss: 0.35, exponent: 16, ambient: 0.5 })}
${shadowFilter('ground', { blur: 10, dx: 8, dy: 14, opacity: 0.3, contact: 0.45 })}
<filter id="rubberTexture" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="11" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" result="speck"/>
  <feComposite in="speck" in2="SourceAlpha" operator="in"/>
</filter>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfccc6"/><stop offset="0.45" stop-color="#9a968f"/><stop offset="0.7" stop-color="#b6b2ab"/><stop offset="1" stop-color="#76726b"/></linearGradient>`;
  const svg =
    `<defs>${STUDIO}${defs}</defs>${studio()}` +
    `<g transform="rotate(${back ? 12 : -12} 480 640) skewX(${back ? 4 : -4})">${shadow}${jumpBack}${edge}${face}${jumpFront}${ring}</g>${grain()}`;
  return { svg, detail: back ? [250, 330, 520, 650] : [190, 330, 520, 650] };
}

// ─── Figura de la mascota ───────────────────────────────────────────────────

function figure(colorId: string, side: Side): { svg: string; detail: Box } {
  const light = colorId === 'blanco';
  const body = light ? '#e8e5de' : '#1d1d1e';
  const paint = light ? '#1e1e1e' : '#ece9e2';
  const plinthTop = light ? '#dfdbd3' : '#272728';
  const plinthSide = light ? '#cbc6bd' : '#171718';
  const back = side === 'back';
  const w = 580;
  const h = w * markAspect('mascot');
  const x = 480 - w / 2;
  const y = 878 - h * 0.965; // la silueta tiene ≈3,5 % de aire bajo los pies
  const silhouette = (fill: string) => markAt('mascot', x, y, w, `${path('mascot', fill, 'fill')}${path('mascot', fill)}`, back);
  // Volumen: resina mate (mapa de alturas muy suave = cabeza redondeada) y la línea oficial pintada a mano.
  // Volumen de cabeza: luz suave arriba a la izquierda y caída hacia abajo a la derecha (sin bandas).
  const volume = `<mask id="figMask">${silhouette('#fff')}</mask><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#figVolume)" mask="url(#figMask)"/>`;
  const figureBody =
    `<g filter="url(#resin)">${silhouette(body)}</g>` +
    (back ? '' : `<g filter="url(#paintLit)">${markAt('mascot', x, y, w, path('mascot', paint))}</g>`) +
    volume +
    `<g filter="url(#rim)">${silhouette('#fff')}</g>`;
  const plinth =
    `<g filter="url(#ground)"><ellipse cx="480" cy="900" rx="252" ry="50" fill="#000"/></g>` +
    `<path d="M228,872 L228,902 A252,50 0 0,0 732,902 L732,872 Z" fill="${plinthSide}" filter="url(#plinthLit)"/>` +
    `<ellipse cx="480" cy="872" rx="252" ry="50" fill="${plinthTop}" filter="url(#plinthLit)"/>` +
    `<ellipse cx="480" cy="880" rx="190" ry="26" fill="#000" opacity="0.18" filter="url(#contact)"/>` +
    `<text x="480" y="938" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" letter-spacing="2.4" fill="${light ? '#aaa49a' : '#3d3d3e'}">07 / 50</text>`;
  const defs = `${litFilter('resin', { soft: 10, height: 6, gloss: 0.16, exponent: 10, ambient: 0.36 })}
<radialGradient id="figVolume" cx="0.38" cy="0.3" r="0.78">
  <stop offset="0" stop-color="#fff" stop-opacity="${light ? 0.1 : 0.11}"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/>
  <stop offset="0.8" stop-color="#000" stop-opacity="${light ? 0.1 : 0.22}"/><stop offset="1" stop-color="#000" stop-opacity="${light ? 0.2 : 0.35}"/>
</radialGradient>
${litFilter('paintLit', { soft: 2, height: 2, gloss: 0.1, exponent: 12, ambient: 0.6 })}
${litFilter('plinthLit', { soft: 6, height: 4, gloss: 0.1, exponent: 8, ambient: 0.5 })}
${shadowFilter('ground', { blur: 16, dx: 12, dy: 12, opacity: 0.24, contact: 0.42 })}
<filter id="contact" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="rim" x="-10%" y="-10%" width="120%" height="120%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/><feOffset in="b" dx="-5" dy="-6" result="o"/>
  <feComposite in="SourceAlpha" in2="o" operator="out" result="edge"/>
  <feFlood flood-color="#ffffff" flood-opacity="${light ? 0.15 : 0.1}"/><feComposite in2="edge" operator="in"/>
</filter>`;
  const svg = `<defs>${STUDIO}${defs}</defs>${studio()}${plinth}${figureBody}${grain()}`;
  return { svg, detail: [230, 360, 500, 625] };
}

// ─── Monograma de escritorio ────────────────────────────────────────────────

function deskMonogram(colorId: string, side: Side): { svg: string; detail: Box } {
  const light = colorId === 'blanco';
  const back = side === 'back';
  const w = 560;
  const h = w * markAspect('monogram');
  const x = 190;
  const baseY = 858; // apoyo de la pieza sobre la base
  const y = baseY - h;
  const n = 18;
  const step: [number, number] = [1.45, -0.95]; // profundidad hacia el fondo, arriba a la derecha
  const H = (fill: string, dx = 0, dy = 0) => `<g transform="translate(${dx} ${dy})">${markAt('monogram', x, y, w, path('monogram', fill), back)}</g>`;
  let depth = '';
  for (let k = n; k >= 1; k--) depth += H(light ? mix('#cbc6bc', '#b0a99d', k / n) : mix('#2c2b2a', '#121212', k / n), step[0] * k, step[1] * k);
  const faceFill = light ? 'url(#faceLight)' : 'url(#faceDark)';
  const front = `<g filter="url(#lacquer)">${H(faceFill)}</g>` + `<g mask="url(#faceMask)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#reflection)"/></g>`;
  // Base antideslizante: bloque bajo con cara superior en perspectiva.
  const bx0 = x - 34;
  const bx1 = x + w + 34;
  const dx = step[0] * (n + 6);
  const dy = step[1] * (n + 6);
  const baseTop = `M${bx0},${baseY + 8} L${bx1},${baseY + 8} L${bx1 + dx},${baseY + 8 + dy} L${bx0 + dx},${baseY + 8 + dy} Z`;
  const base =
    `<g filter="url(#ground)"><path d="${baseTop} M${bx0},${baseY + 8} h${bx1 - bx0} v14 h${bx0 - bx1} Z" fill="#000"/></g>` +
    `<path d="${baseTop}" fill="${light ? '#d8d3ca' : '#262626'}" filter="url(#rubber)"/>` +
    `<rect x="${bx0}" y="${baseY + 8}" width="${bx1 - bx0}" height="14" fill="${light ? '#bdb7ab' : '#151515'}"/>` +
    `<path d="M${bx1},${baseY + 8} L${bx1 + dx},${baseY + 8 + dy} L${bx1 + dx},${baseY + 22 + dy} L${bx1},${baseY + 22} Z" fill="${light ? '#aaa397' : '#0f0f0f'}"/>`;
  // Sombra proyectada sobre la base y el suelo, hacia el fondo a la derecha.
  const cast = `<g filter="url(#cast)" opacity="0.5"><g transform="translate(0 ${baseY}) skewX(-52) scale(1 0.2) translate(0 ${-baseY})">${H('#000')}</g></g>`;
  const defs = `${litFilter('lacquer', { soft: 2.5, height: 3, gloss: light ? 0.3 : 0.38, exponent: 30, ambient: 0.45 })}
${litFilter('rubber', { soft: 2, height: 1.5, gloss: 0.04, exponent: 6, ambient: 0.62 })}
${shadowFilter('ground', { blur: 12, dx: 10, dy: 8, opacity: 0.22, contact: 0.4 })}
<filter id="cast" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
<linearGradient id="faceDark" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#2f2f30"/><stop offset="0.55" stop-color="#1b1b1c"/><stop offset="1" stop-color="#141415"/></linearGradient>
<linearGradient id="faceLight" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#f3f1ec"/><stop offset="0.6" stop-color="#e6e2da"/><stop offset="1" stop-color="#d9d4ca"/></linearGradient>
<linearGradient id="reflection" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + w * 0.7}" y2="${y + h}">
  <stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="0.33" stop-color="#fff" stop-opacity="${light ? 0.18 : 0.09}"/><stop offset="0.4" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<mask id="faceMask">${H('#fff')}</mask>`;
  const svg = `<defs>${STUDIO}${defs}</defs>${studio()}${base}${cast}${depth}${front}${grain()}`;
  return { svg, detail: [230, 400, 500, 625] };
}

function mix(a: string, b: string, t: number) {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`;
}

// ─── Stickers ───────────────────────────────────────────────────────────────

const INK_DARK = '#161616';
const INK_LIGHT = '#f4f3ef';
const RED = '#c8102e';

/** Vinilo troquelado: borde blanco de `r` px, canto fino, sombra de contacto y sombra amplia. */
function vinylFilter(r: number) {
  return `<filter id="vinyl-${r}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="grow"/>
  <feGaussianBlur in="grow" stdDeviation="2" result="soft"/>
  <feComponentTransfer in="soft" result="cut"><feFuncA type="linear" slope="7" intercept="-3"/></feComponentTransfer>
  <feMorphology in="cut" operator="erode" radius="1.1" result="inner"/>
  <feComposite in="cut" in2="inner" operator="out" result="ring"/>
  <feFlood flood-color="#b9b4ab"/><feComposite in2="ring" operator="in" result="edge"/>
  <feFlood flood-color="#fbfaf6"/><feComposite in2="inner" operator="in" result="border"/>
  <feGaussianBlur in="cut" stdDeviation="9" result="sb"/><feOffset in="sb" dx="7" dy="12" result="so"/>
  <feFlood flood-color="#2a241d" flood-opacity="0.14"/><feComposite in2="so" operator="in" result="shadow"/>
  <feGaussianBlur in="cut" stdDeviation="1.4" result="cb"/><feOffset in="cb" dx="0.8" dy="1.6" result="co"/>
  <feFlood flood-color="#2a241d" flood-opacity="0.3"/><feComposite in2="co" operator="in" result="contact"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="contact"/><feMergeNode in="edge"/><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="vinylMask-${r}" x="-25%" y="-25%" width="150%" height="150%">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="grow"/>
  <feGaussianBlur in="grow" stdDeviation="2" result="soft"/>
  <feComponentTransfer in="soft" result="cut"><feFuncA type="linear" slope="7" intercept="-3"/></feComponentTransfer>
  <feFlood flood-color="#fff"/><feComposite in2="cut" operator="in"/>
</filter>`;
}

let stickerSeq = 0;

/** Un sticker: marca oficial + borde troquelado + reflejo de vinilo en diagonal. */
function stickerAt(mark: Mark, cx: number, cy: number, w: number, color: string, rotate: number, border = 14) {
  stickerSeq += 1;
  const h = w * markAspect(mark);
  const x = cx - w / 2;
  const y = cy - h / 2;
  const art = mark === 'mascot' ? `${path('mascot', INK_DARK, 'fill')}${path('mascot', INK_LIGHT)}` : path(mark, color);
  const id = `sheen-${stickerSeq}`;
  const sheen =
    `<mask id="${id}-m"><g filter="url(#vinylMask-${border})">${markAt(mark, x, y, w, art)}</g></mask>` +
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.36" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset="0.42" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.47" stop-color="#fff" stop-opacity="0.05"/>` +
    `<stop offset="0.8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.07"/></linearGradient>`;
  return (
    `<g transform="rotate(${rotate} ${cx} ${cy})">${sheen}` +
    `<g filter="url(#vinyl-${border})">${markAt(mark, x, y, w, art)}</g>` +
    `<rect x="${x - border * 2}" y="${y - border * 2}" width="${w + border * 4}" height="${h + border * 4}" fill="url(#${id})" mask="url(#${id}-m)"/></g>`
  );
}

function stickers(product: Product, side: Side): { svg: string; detail: Box } {
  stickerSeq = 0;
  let body: string;
  let sheet: Box;
  let detail: Box;
  if (product.artwork === 'wordmark') {
    body =
      stickerAt('wordmark', 455, 330, 470, INK_DARK, -4) +
      stickerAt('monogram', 690, 520, 190, RED, 8, 12) +
      stickerAt('star', 300, 520, 300, INK_DARK, -10, 12) +
      stickerAt('mascot', 470, 720, 250, INK_DARK, 5, 12) +
      stickerAt('star', 720, 820, 160, RED, 14, 10) +
      stickerAt('monogram', 250, 800, 170, INK_DARK, -8, 10);
    sheet = [130, 220, 700, 720];
    detail = [150, 200, 520, 650];
  } else if (product.artwork === 'mascot') {
    body = stickerAt('mascot', 480, 590, 440, INK_DARK, -4);
    sheet = [200, 360, 560, 470];
    detail = [220, 300, 520, 650];
  } else {
    body = stickerAt('star', 480, 600, 580, RED, -8);
    sheet = [150, 400, 660, 400];
    detail = [170, 300, 520, 650];
  }
  let backing = '';
  if (side === 'back') {
    // Sobre su hoja de soporte, con el corte a medio canto.
    const [x, y, w, h] = sheet;
    backing =
      `<g filter="url(#paperShadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#000"/></g>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#f8f6f1"/>` +
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="14" fill="none" stroke="#d8d3ca" stroke-width="1"/>`;
  }
  const defs = `${vinylFilter(14)}${vinylFilter(12)}${vinylFilter(10)}
${shadowFilter('paperShadow', { blur: 10, dx: 6, dy: 10, opacity: 0.14, contact: 0.2 })}`;
  const svg = `<defs>${STUDIO}${defs}</defs>${studio()}${backing}${body}${grain()}`;
  return { svg, detail };
}

// ─── Entrada ────────────────────────────────────────────────────────────────

export interface ObjectShot {
  /** Imagen a resolución de trabajo (SCALE × 960×1200). */
  png: Buffer;
  /** Caja de la vista de detalle en el lienzo de 960×1200. */
  detail: Box;
}

/** Foto virtual de un producto con forma de marca. */
export async function objectShot(product: Product, colorId: string, side: Side): Promise<ObjectShot> {
  let scene: { svg: string; detail: Box };
  if (product.silhouette === 'keychain') scene = keychain(colorId, side);
  else if (product.silhouette === 'figure') scene = figure(colorId, side);
  else if (product.silhouette === 'object') scene = deskMonogram(colorId, side);
  else scene = stickers(product, side);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" style="display:block">${scene.svg}</svg>`;
  return { png: await svgToPng(svg, W * SCALE, H * SCALE, false), detail: scene.detail };
}
