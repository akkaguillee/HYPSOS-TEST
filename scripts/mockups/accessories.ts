/**
 * Accesorios, piezas impresas en 3D y stickers en el mismo lenguaje de dibujo plano técnico.
 * Cada función devuelve la escena (encuadrada al ≈50 % del ancho del tile; stickers ≈60 %) y la
 * zona que se amplía en la vista de detalle (espacio de diseño, proporción 4:5).
 */
import { mascotVector } from '../../src/assets/brand/mascot';
import { monogramVector } from '../../src/assets/brand/monogram';
import type { Product } from '../../shared/types';
import { type Box, type Curve, INK_DARK, INK_LIGHT, type Mark, mirror, Scene, shade, STROKE, vectorAt, VECTORS } from './kit';

const RED = '#c8102e';
const NS = 'vector-effect="non-scaling-stroke"';
type View = 'front' | 'back';
type Result = { scene: Scene; detail?: Box };

export function accessory(product: Product, colorId: string, view: View, fabric: string): Result {
  const back = view === 'back';
  switch (product.silhouette) {
    case 'cap':
      return cap(fabric, back);
    case 'beanie':
      return beanie(fabric, back);
    case 'tote':
      return tote(fabric, back);
    case 'socks':
      return socks(fabric, back);
    case 'keychain':
      return keychain(fabric, back);
    case 'figure':
      return figure(colorId, back);
    case 'object':
      return deskMonogram(colorId, back);
    case 'sticker':
      return sticker(product, back);
    default:
      return { scene: new Scene(fabric, 'accessory') };
  }
}

const line = (a: [number, number], b: [number, number]): Curve => [a, [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + (2 * (b[0] - a[0])) / 3, a[1] + (2 * (b[1] - a[1])) / 3], b];
const metal = (s: Scene) => (s.dark ? '#5d5a56' : '#c9c6c0');

// ─── Gorra de seis paneles ──────────────────────────────────────────────────

const CROWN = 'M196,604 C186,420 268,266 400,262 C532,266 614,420 604,604 C520,626 280,626 196,604Z';
const VISOR = 'M196,604 C280,626 520,626 604,604 C616,610 620,622 612,634 C540,676 260,676 188,634 C180,622 184,610 196,604Z';

function cap(fabric: string, back: boolean): Result {
  const s = new Scene(fabric, 'accessory');
  if (!back) s.part(VISOR);
  s.part(CROWN);
  // Costuras de los paneles, ojales y botón superior.
  s.seam('M400,266 C404,400 404,500 400,620');
  s.seam('M396,266 C318,330 268,450 262,618');
  s.seam(mirror('M396,266 C318,330 268,450 262,618'));
  s.stitch('M390,276 C394,400 394,500 390,618');
  s.stitch('M410,276 C414,400 414,500 410,618');
  for (const [x, y] of [
    [300, 362],
    [500, 362],
  ])
    s.add(`<circle cx="${x}" cy="${y}" r="6" fill="${shade(fabric, s.dark ? -0.4 : -0.2)}" stroke="${s.outline}" stroke-width="1.2" ${NS}/>`);
  s.add(`<ellipse cx="400" cy="265" rx="15" ry="8" fill="${fabric}" stroke="${s.outline}" stroke-width="${STROKE.outline}" ${NS}/>`);
  if (back) {
    // Abertura trasera con tira y cierre metálico; la etiqueta roja va en la tira.
    s.part('M318,616 C320,540 360,500 400,500 C440,500 480,540 482,616Z', { fill: shade(fabric, s.dark ? -0.45 : -0.22), silhouette: false });
    s.stitchAlong([[312, 612], [314, 532], [358, 492], [400, 492]], -1);
    s.stitchAlong([[400, 492], [442, 492], [486, 532], [488, 612]], -1);
    s.part('M296,566 L504,566 L504,594 L296,594Z', { silhouette: false });
    s.stitch('M300,572 L500,572');
    s.stitch('M300,588 L500,588');
    s.part('M370,556 L430,556 L430,604 L370,604Z', { fill: metal(s), silhouette: false });
    s.part('M384,568 L416,568 L416,592 L384,592Z', { fill: shade(fabric, s.dark ? -0.45 : -0.22), silhouette: false });
    s.tab(462, 594, 1, { angle: 90, len: 13, h: 10 });
  } else {
    // Visera curva con pespuntes concéntricos.
    for (const k of [0, 1, 2, 3]) s.stitch(`M${200 + k * 4},${636 + k * 2} C${280},${662 + k * 4} ${520},${662 + k * 4} ${600 - k * 4},${636 + k * 2}`);
    s.print({ mark: 'monogram', x: 332, y: 392, w: 136, technique: 'embroidery', color: s.dark ? INK_LIGHT : INK_DARK });
  }
  return { scene: s, detail: [292, 322, 216, 270] };
}

// ─── Gorro de canalé con doble vuelta ───────────────────────────────────────

const BEANIE = 'M236,724 L236,430 C236,270 312,196 400,196 C488,196 564,270 564,430 L564,724Z';

function beanie(fabric: string, back: boolean): Result {
  const s = new Scene(fabric, 'accessory');
  s.part(BEANIE);
  const clip = s.uid('beanie');
  s.def(`<clipPath id="${clip}"><path d="${BEANIE}"/></clipPath>`);
  let ribs = '';
  for (let x = 246; x < 556; x += 10) {
    const tip = 400 + (x - 400) * 0.12;
    ribs += `M${x},724 L${x},430 C${x},300 ${400 + (x - 400) * 0.55},214 ${tip},198`;
  }
  s.add(`<path d="${ribs}" fill="none" stroke="${s.seamColor}" stroke-width="${STROKE.rib}" opacity="0.85" clip-path="url(#${clip})" ${NS}/>`);
  s.edge(BEANIE);
  // Doble vuelta de canalé.
  s.rib([[222, 560], [340, 552], [460, 552], [578, 560]], [[216, 744], [340, 754], [460, 754], [584, 744]], { spacing: 9 });
  s.seam('M224,572 C340,564 460,564 576,572');
  // Etiqueta tejida roja en el canto de la vuelta.
  if (back) s.tab(580, 604, 1, { len: 14, h: 18 });
  else s.tab(220, 604, -1, { len: 14, h: 18 });
  return { scene: s, detail: [176, 500, 220, 275] };
}

// ─── Bolsa tote de lona ─────────────────────────────────────────────────────

function tote(fabric: string, back: boolean): Result {
  const s = new Scene(fabric, 'accessory');
  const handle = 'M296,344 C292,250 310,164 360,150 L440,150 C490,164 508,250 504,344 L476,344 C478,262 466,190 432,180 L368,180 C334,190 322,262 324,344Z';
  s.part(handle);
  s.stitch('M303,340 C300,254 318,174 362,158 L438,158 C482,174 500,254 497,340');
  s.stitch('M317,340 C316,260 328,196 366,173 L434,173 C472,196 484,260 483,340');
  s.part('M206,336 L594,336 C598,520 600,700 604,880 L196,880 C200,700 202,520 206,336Z');
  // Dobladillo superior y refuerzos en cruz de las asas.
  s.seam('M207,378 L593,378');
  s.stitch('M207,370 L593,370');
  s.stitch('M198,866 L602,866');
  for (const x of [296, 476]) {
    s.stitch(`M${x + 2},346 L${x + 26},346 L${x + 26},372 L${x + 2},372Z M${x + 2},346 L${x + 26},372 M${x + 26},346 L${x + 2},372`);
  }
  if (back) s.tab(600, 800, 1, { len: 14, h: 18 });
  else {
    s.tab(200, 800, -1, { len: 14, h: 18 });
    s.print({ mark: 'wordmark', x: 270, y: 560, w: 260, technique: 'screen', color: s.dark ? INK_LIGHT : INK_DARK });
  }
  return { scene: s, detail: [248, 470, 304, 380] };
}

// ─── Calcetines (pack de 3) ─────────────────────────────────────────────────

const SOCK = 'M318,150 L452,150 L456,560 C458,604 476,628 520,648 L640,702 C690,724 694,800 646,818 C620,828 590,824 566,812 L372,716 C330,694 314,656 314,610Z';

function socks(fabric: string, back: boolean): Result {
  const s = new Scene(fabric, 'accessory');
  const poses = [
    { r: -16, x: -150, y: 50 },
    { r: -2, x: -40, y: 20 },
    { r: 12, x: 70, y: -6 },
  ];
  for (const p of poses) {
    // La espalda es la imagen especular del frente: la otra cara de cada calcetín.
    const pose = back ? { r: -p.r, x: -p.x, y: p.y } : p;
    const sub = new Scene(fabric, 'accessory');
    sub.part(SOCK);
    sub.rib(line([318, 150], [452, 150]), line([317, 240], [452.6, 240]), { spacing: 6 });
    // Refuerzo de talón y puntera.
    sub.part('M314,610 C314,656 330,694 372,716 L420,740 C380,690 380,630 420,600 C396,600 340,600 314,600Z', { fill: shade(fabric, sub.dark ? 0.06 : -0.06) });
    sub.part('M600,686 L640,702 C690,724 694,800 646,818 C620,828 590,824 566,812 L560,808 C600,790 610,730 600,686Z', { fill: shade(fabric, sub.dark ? 0.06 : -0.06) });
    sub.stitch('M386,708 C364,672 366,628 400,604');
    sub.stitch('M574,804 C604,786 614,736 606,694');
    if (!back) sub.print({ mark: 'monogram', x: 357, y: 170, w: 56, technique: 'woven', color: sub.dark ? INK_LIGHT : INK_DARK });
    sub.tab(317, 206, -1, { len: 12, h: 13 });
    // La espalda muestra la otra cara del calcetín (reflejado), con la etiqueta en el mismo canto.
    const flip = back ? ' translate(800 0) scale(-1 1)' : '';
    s.add(`<g transform="translate(${pose.x} ${pose.y}) rotate(${pose.r} 400 480)${flip}">${sub.fragment()}</g>`);
    s.silhouette(transformPath(back ? mirror(SOCK) : SOCK, pose));
  }
  return { scene: s, detail: [404, 96, 220, 275] };
}

/** Silueta transformada (encuadre y sombra de suelo). */
function transformPath(d: string, pose: { r: number; x: number; y: number }) {
  const rad = (pose.r * Math.PI) / 180;
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, xs, ys) => {
    const x = Number(xs) - 400;
    const y = Number(ys) - 480;
    const nx = x * Math.cos(rad) - y * Math.sin(rad) + 400 + pose.x;
    const ny = x * Math.sin(rad) + y * Math.cos(rad) + 480 + pose.y;
    return `${nx.toFixed(1)},${ny.toFixed(1)}`;
  });
}

// ─── Llavero de zamak esmaltado ─────────────────────────────────────────────

function keychain(fabric: string, back: boolean): Result {
  const s = new Scene(fabric, 'accessory', { outline: '#2a2a2a', seam: '#2a2a2a' });
  const steel = '#cfccc6';
  const x = 200;
  const y = 380;
  const w = 430;
  const d = monogramVector.d;
  const flip = back ? ` transform="translate(${2 * x + w} 0) scale(-1 1)"` : '';
  // Canto metálico: contorno, filo de zamak y esmalte (o metal en el reverso).
  const body =
    `<path d="${d}" fill="none" stroke="#2a2a2a" stroke-width="13" stroke-linejoin="round" ${NS}/>` +
    `<path d="${d}" fill="none" stroke="${steel}" stroke-width="9" stroke-linejoin="round" ${NS}/>` +
    `<path d="${d}" fill="${back ? '#b5b2ab' : fabric}"/>`;
  s.add(`<g${flip}>${vectorAt('monogram', x, y, w, body)}</g>`);
  // Anilla de acero y eslabón.
  s.add(
    `<path d="M300,203 a97,97 0 1,0 0.01,0 Z M300,213 a87,87 0 1,1 -0.01,0 Z" fill="${steel}" fill-rule="evenodd" stroke="#2a2a2a" stroke-width="${STROKE.outline}" ${NS}/>` +
      `<path d="M300,206 a94,94 0 0,0 -90,66" fill="none" stroke="#2a2a2a" stroke-width="0.8" ${NS}/>` +
      `<rect x="314" y="380" width="38" height="16" rx="8" fill="none" stroke="#2a2a2a" stroke-width="8" transform="rotate(40 333 388)" ${NS}/>` +
      `<rect x="314" y="380" width="38" height="16" rx="8" fill="none" stroke="${steel}" stroke-width="5" transform="rotate(40 333 388)" ${NS}/>`,
  );
  s.bounds([200, 203, 430, 486]);
  return { scene: s, detail: [236, 300, 336, 420] };
}

// ─── Figura de la mascota (impresión 3D en resina) ──────────────────────────

function figure(colorId: string, back: boolean): Result {
  const light = colorId === 'blanco';
  const fill = light ? '#f2f2f0' : '#121212';
  const s = new Scene(fill, 'accessory');
  const lineArt = light ? INK_DARK : INK_LIGHT;
  // Peana redonda numerada.
  s.part('M190,760 L190,792 C190,830 610,830 610,792 L610,760Z', { fill: shade(fill, light ? -0.1 : 0.08), silhouette: false });
  s.add(`<ellipse cx="400" cy="760" rx="210" ry="34" fill="${shade(fill, light ? -0.04 : 0.04)}" stroke="${s.outline}" stroke-width="${STROKE.outline}" ${NS}/>`);
  const outlined = `<path d="${mascotVector.fill}" fill="none" stroke="${s.outline}" stroke-width="4.2" stroke-linejoin="round" ${NS}/><path d="${mascotVector.d}" fill="none" stroke="${s.outline}" stroke-width="4.2" stroke-linejoin="round" ${NS}/>`;
  const inner = back
    ? `${outlined}<path d="${mascotVector.fill}" fill="${fill}"/><path d="${mascotVector.d}" fill="${fill}"/>`
    : `${outlined}<path d="${mascotVector.fill}" fill="${fill}"/><path d="${mascotVector.d}" fill="${lineArt}"/>`;
  s.add(back ? `<g transform="translate(800 0) scale(-1 1)">${vectorAt('mascot', 150, 346, 500, inner)}</g>` : vectorAt('mascot', 150, 346, 500, inner));
  s.bounds([150, 346, 500, 484]);
  return { scene: s, detail: [226, 360, 348, 435] };
}

// ─── Monograma de escritorio (impresión 3D lacada) ──────────────────────────

function deskMonogram(colorId: string, back: boolean): Result {
  const light = colorId === 'blanco';
  const face = light ? '#f2f2f0' : '#121212';
  const side = light ? '#d6d2ca' : '#2a2826';
  const s = new Scene(face, 'accessory');
  const d = monogramVector.d;
  const flip = back ? ` transform="translate(800 0) scale(-1 1)"` : '';
  // Base antideslizante.
  s.part('M176,716 L624,716 L644,736 L156,736Z', { fill: light ? '#e2ded6' : '#1e1d1c', silhouette: false });
  s.part('M156,736 L644,736 L644,748 L156,748Z', { fill: light ? '#cfcac1' : '#2a2826', silhouette: false });
  // Canto (extrusión) y cara frontal.
  const stroke = (color: string, width: number) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" ${NS}/>`;
  // Profundidad maciza: copias apiladas entre la cara trasera (con contorno) y la frontal.
  let depth = vectorAt('monogram', 170, 372, 480, `${stroke(s.outline, STROKE.outline * 2)}<path d="${d}" fill="${side}"/>`);
  for (let k = 9; k >= 1; k--) depth += vectorAt('monogram', 160 + k, 362 + k, 480, `<path d="${d}" fill="${side}"/>`);
  s.add(`<g${flip}>${depth}${vectorAt('monogram', 160, 362, 480, `${stroke(s.outline, STROKE.outline * 2)}<path d="${d}" fill="${face}"/>`)}</g>`);
  s.bounds([156, 362, 488, 386]);
  return { scene: s, detail: [232, 340, 320, 400] };
}

// ─── Stickers de vinilo troquelado ──────────────────────────────────────────

/** Borde blanco troquelado con contorno fino y una sombra mínima. */
const diecut = (r: number) => `<filter id="diecut-${r}" x="-25%" y="-25%" width="150%" height="150%">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="grow"/>
  <feGaussianBlur in="grow" stdDeviation="1.2" result="soft"/>
  <feComponentTransfer in="soft" result="edge"><feFuncA type="linear" slope="8" intercept="-3"/></feComponentTransfer>
  <feMorphology in="edge" operator="dilate" radius="1.1" result="ring"/>
  <feFlood flood-color="#2a2a2a"/><feComposite in2="ring" operator="in" result="line"/>
  <feFlood flood-color="#ffffff"/><feComposite in2="edge" operator="in" result="border"/>
  <feGaussianBlur in="ring" stdDeviation="2.5" result="sb"/><feOffset in="sb" dy="3" result="so"/>
  <feFlood flood-color="#2b2620" flood-opacity="0.16"/><feComposite in2="so" operator="in" result="shadow"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="line"/><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;

function stickerAt(mark: Mark, x: number, y: number, w: number, color: string, rotate: number, border = 14) {
  const v = VECTORS[mark];
  const h = (w * v.height) / v.width;
  const inner = mark === 'mascot' ? `<path d="${mascotVector.fill}" fill="${INK_DARK}"/><path d="${v.d}" fill="${INK_LIGHT}"/>` : `<path d="${v.d}" fill="${color}"/>`;
  return `<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})" filter="url(#diecut-${border})">${vectorAt(mark, x, y, w, inner)}</g>`;
}

function sticker(product: Product, back: boolean): Result {
  const s = new Scene('#ffffff', 'sticker', { outline: '#2a2a2a', seam: '#2a2a2a' });
  s.def(diecut(14));
  s.def(diecut(12));
  s.def(diecut(10));
  let body = '';
  let box: Box;
  let detail: Box;
  if (product.artwork === 'wordmark') {
    body =
      stickerAt('wordmark', 150, 170, 440, INK_DARK, -4) +
      stickerAt('monogram', 470, 380, 190, RED, 8, 12) +
      stickerAt('star', 120, 380, 330, INK_DARK, -10, 12) +
      stickerAt('mascot', 300, 520, 250, INK_DARK, 5, 12) +
      stickerAt('star', 560, 640, 150, RED, 14, 10) +
      stickerAt('monogram', 110, 690, 170, INK_DARK, -8, 10);
    box = [100, 140, 600, 720];
    detail = [124, 120, 336, 420];
  } else if (product.artwork === 'mascot') {
    body = stickerAt('mascot', 190, 300, 420, INK_DARK, -4);
    box = [176, 270, 448, 380];
    detail = [236, 290, 304, 380];
  } else {
    body = stickerAt('star', 120, 330, 560, RED, -8);
    box = [106, 270, 588, 400];
    detail = [130, 360, 288, 360];
  }
  if (back) {
    // Sobre su hoja de soporte (corte a medio canto).
    const [x, y, w, h] = box;
    const m = 36;
    s.add(`<rect x="${x - m}" y="${y - m}" width="${w + 2 * m}" height="${h + 2 * m}" rx="16" fill="#fbfaf7" stroke="#2a2a2a" stroke-width="${STROKE.outline}" ${NS}/>`);
    s.silhouette(`M${x - m},${y - m} L${x + w + m},${y - m} L${x + w + m},${y + h + m} L${x - m},${y + h + m}Z`);
    box = [x - m, y - m, w + 2 * m, h + 2 * m];
  }
  s.add(body);
  s.bounds(box);
  return { scene: s, detail };
}
