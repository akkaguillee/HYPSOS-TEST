/**
 * Accesorios, piezas impresas en 3D y stickers. Cada función devuelve el SVG completo y la zona
 * que se amplía en la vista de detalle.
 */
import { mascotVector } from '../../src/assets/brand/mascot';
import { monogramVector } from '../../src/assets/brand/monogram';
import { starVector } from '../../src/assets/brand/star';
import { wordmarkVector } from '../../src/assets/brand/wordmark';
import type { MediaView, Product } from '../../shared/types';
import type { Box } from './apparel';
import { INK_DARK, INK_LIGHT, mirror, Scene, shade, sym, W, H } from './kit';

const RED = '#c8102e';
type Result = { svg: string; detail?: Box };

export function accessory(product: Product, colorId: string, view: MediaView, fabric: string): Result {
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
      return { svg: new Scene(fabric).toSVG() };
  }
}

// ─── Gorra de seis paneles ──────────────────────────────────────────────────

function cap(fabric: string, back: boolean): Result {
  const s = new Scene(fabric);
  const crown = 'M190,600 C178,430 270,292 400,288 C530,292 622,430 610,600 C520,624 280,624 190,600Z';
  if (!back) {
    // Visera curva vista ligeramente desde arriba.
    s.part('M164,592 C230,636 570,636 636,592 C640,626 580,694 400,700 C220,694 160,626 164,592Z', { inner: s.dark ? 0.55 : 0.32, blur: 10 });
    s.add(`<path d="M164,592 C230,636 570,636 636,592 C640,626 580,694 400,700 C220,694 160,626 164,592Z" fill="url(#light)" opacity="0.5" style="mix-blend-mode:soft-light"/>`);
    for (const k of [0, 1, 2]) {
      const y = 640 + k * 16;
      s.stitch(`M${200 + k * 22},${y - 22} C${300},${y + 18} ${500},${y + 18} ${600 - k * 22},${y - 22}`);
    }
  }
  s.part(crown, { blur: 14 });
  s.seam('M400,292 C404,400 404,500 400,616');
  s.seam('M396,292 C320,350 270,460 262,616');
  s.seam(mirror('M396,292 C320,350 270,460 262,616'));
  for (const [x, y] of [
    [300, 380],
    [500, 380],
  ])
    s.add(`<circle cx="${x}" cy="${y}" r="5" fill="#000" opacity="0.55"/><circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${s.thread}" stroke-width="1.5"/>`);
  s.add(`<ellipse cx="400" cy="292" rx="16" ry="9" fill="${shade(fabric, -0.25)}"/>`);
  s.fold('M250,420 C240,480 236,540 240,600', 0.5, 14);
  s.fold(mirror('M250,420 C240,480 236,540 240,600'), 0.4, 14);
  if (back) {
    s.part('M318,616 C320,540 360,500 400,500 C440,500 480,540 482,616Z', { fill: '#000', inner: 0.3, silhouette: false, outline: 0 });
    s.add(`<path d="M318,616 C320,540 360,500 400,500 C440,500 480,540 482,616Z" fill="${fabric}" opacity="0.35"/>`);
    s.part('M300,566 L500,566 L500,594 L300,594Z', { inner: 0.4, blur: 4, silhouette: false });
    s.add(
      `<rect x="372" y="556" width="56" height="48" rx="6" fill="#9c9c9c"/><rect x="372" y="556" width="56" height="48" rx="6" fill="url(#light)"/><rect x="384" y="568" width="32" height="24" rx="3" fill="${fabric}"/>`,
    );
  } else {
    s.print({ mark: 'monogram', x: 335, y: 400, w: 130, technique: 'embroidery', color: s.dark ? INK_LIGHT : INK_DARK });
  }
  return { svg: s.toSVG(), detail: [290, 340, 220, 275] };
}

// ─── Gorro de canalé con doble vuelta ───────────────────────────────────────

function beanie(fabric: string, back: boolean): Result {
  const s = new Scene(fabric);
  s.rib('M236,720 L236,430 C236,270 312,196 400,196 C488,196 564,270 564,430 L564,720Z', 0);
  s.fold('M300,260 C340,240 370,232 400,232', 0.6, 14);
  s.rib('M222,560 C340,552 460,552 578,560 L584,742 C460,752 340,752 216,742Z', 0, { inner: s.dark ? 0.6 : 0.34 });
  s.fold('M224,566 C340,560 460,560 576,566', 0.8, 8);
  if (!back) s.label(372, 610, 56, 36, RED);
  return { svg: s.toSVG(), detail: [300, 520, 200, 250] };
}

// ─── Bolsa tote de lona ─────────────────────────────────────────────────────

function tote(fabric: string, back: boolean): Result {
  const s = new Scene(fabric);
  const handle = 'M296,344 C292,250 310,164 360,150 L440,150 C490,164 508,250 504,344 L476,344 C478,262 466,190 432,180 L368,180 C334,190 322,262 324,344Z';
  s.part(handle, { inner: s.dark ? 0.55 : 0.3, blur: 5 });
  s.stitch('M304,340 C302,252 318,176 364,160 L436,160 C482,176 498,252 496,340');
  s.part('M206,336 L594,336 C598,520 600,700 604,880 L196,880 C200,700 202,520 206,336Z', { blur: 12 });
  s.stitch('M210,360 L590,360');
  s.fold('M260,420 C300,520 310,620 300,760', 0.4, 18);
  s.fold('M520,400 C500,500 492,620 510,760', 0.35, 18);
  s.fold('M240,820 C320,804 470,808 560,826', 0.5, 12);
  if (!back) s.print({ mark: 'wordmark', x: 270, y: 560, w: 260, technique: 'screen', color: s.dark ? INK_LIGHT : INK_DARK });
  return { svg: s.toSVG(), detail: [250, 480, 300, 375] };
}

// ─── Calcetines (pack de 3) ─────────────────────────────────────────────────

const SOCK = 'M318,150 L452,150 L456,560 C458,604 476,628 520,648 L640,702 C690,724 694,800 646,818 C620,828 590,824 566,812 L372,716 C330,694 314,656 314,610Z';

function socks(fabric: string, back: boolean): Result {
  const s = new Scene(fabric);
  const poses = back
    ? [
        { r: -18, x: -120, y: 40 },
        { r: 12, x: 40, y: 10 },
      ]
    : [
        { r: -16, x: -150, y: 50 },
        { r: -2, x: -40, y: 20 },
        { r: 12, x: 70, y: -6 },
      ];
  for (const pose of poses) {
    const t = (d: string) => `<g transform="translate(${pose.x} ${pose.y}) rotate(${pose.r} 400 480)">${d}</g>`;
    const sub = new Scene(fabric);
    sub.part(SOCK, { blur: 10 });
    sub.rib('M318,150 L452,150 L452,236 L318,236Z', 0);
    sub.part('M314,610 C314,656 330,694 372,716 L420,740 C380,690 380,630 420,600 C396,600 340,600 314,600Z', { fill: shade(fabric, s.dark ? 0.05 : -0.04), inner: 0.25, blur: 6, silhouette: false });
    sub.part('M600,686 L640,702 C690,724 694,800 646,818 C620,828 590,824 566,812 L560,808 C600,790 610,730 600,686Z', { fill: shade(fabric, s.dark ? 0.05 : -0.04), inner: 0.25, blur: 6, silhouette: false });
    sub.fold('M330,300 C340,380 340,460 336,540', 0.5, 12);
    sub.print({ mark: 'monogram', x: 359, y: 168, w: 52, technique: 'woven', color: s.dark ? INK_LIGHT : INK_DARK });
    const piece = sub.fragment();
    s.def(piece.defs);
    s.silhouette(transformPath(SOCK, pose));
    s.add(t(piece.body));
  }
  return { svg: s.toSVG(), detail: [190, 120, 300, 375] };
}

/** Aproximación de la silueta transformada para la sombra en el suelo. */
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

// ─── Llavero esmaltado ──────────────────────────────────────────────────────

function vectorAt(v: { viewBox: string; transform: string; width: number; height: number }, x: number, y: number, w: number, inner: string, extra = '') {
  const h = (w * v.height) / v.width;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${v.viewBox}" overflow="visible"${extra}><g transform="${v.transform}">${inner}</g></svg>`;
}

function keychain(fabric: string, back: boolean): Result {
  const s = new Scene(fabric);
  const enamel = fabric;
  const metal = '#b9b9b6';
  const x = 200;
  const y = 380;
  const w = 430;
  const scale = 4; // el trazado del vector está escalado ×0,25
  const d = monogramVector.d;
  const body = back
    ? `<path d="${d}" fill="#a7a7a4" stroke="${metal}" stroke-width="${6 * scale}" stroke-linejoin="round"/>`
    : `<path d="${d}" fill="${enamel}" stroke="${metal}" stroke-width="${7 * scale}" stroke-linejoin="round" paint-order="stroke"/>`;
  const flip = back ? ` transform="translate(${2 * x + w} 0) scale(-1 1)"` : '';
  s.add(`<g${flip} opacity="0.35" filter="url(#ground)"><g transform="translate(4 14)">${vectorAt(monogramVector, x, y, w, `<path d="${d}" fill="#000" stroke="#000" stroke-width="${7 * scale}"/>`)}</g></g>`);
  s.add(`<g filter="url(#embroidery)"${flip}>${vectorAt(monogramVector, x, y, w, body)}</g>`);
  if (!back) {
    // Brillo del esmalte.
    s.add(vectorAt(monogramVector, x, y, w, `<path d="${d}" fill="url(#light)"/>`, ' style="mix-blend-mode:screen" opacity="0.6"'));
  } else {
    s.add(vectorAt(monogramVector, x, y, w, `<path d="${d}" fill="url(#weave)" opacity="0.25"/>`, ` transform="translate(${2 * x + w} 0) scale(-1 1)"`));
  }
  // Anilla de acero.
  s.add(
    `<circle cx="300" cy="300" r="92" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="16" filter="url(#contact)" transform="translate(4 8)"/>` +
      `<circle cx="300" cy="300" r="92" fill="none" stroke="${metal}" stroke-width="12"/>` +
      `<circle cx="300" cy="300" r="92" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="3" stroke-dasharray="120 460" transform="rotate(-140 300 300)"/>` +
      `<circle cx="300" cy="300" r="86" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>` +
      `<rect x="316" y="382" width="34" height="14" rx="7" fill="none" stroke="${metal}" stroke-width="6" transform="rotate(40 333 389)"/>`,
  );
  return { svg: s.toSVG(), detail: [200, 220, 260, 325] };
}

// ─── Figura de la mascota (impresión 3D) ────────────────────────────────────

function figure(colorId: string, back: boolean): Result {
  const s = new Scene(colorId === 'blanco' ? '#ecebe6' : '#18181a');
  const light = colorId === 'blanco';
  const fill = light ? '#ecebe6' : '#151517';
  const line = light ? '#161616' : '#f1f1ee';
  // Peana redonda.
  s.add(
    `<ellipse cx="400" cy="800" rx="210" ry="40" fill="#000" opacity="0.35" filter="url(#ground)"/>` +
      `<path d="M190,760 L190,792 C190,820 610,820 610,792 L610,760Z" fill="${shade(fill, light ? -0.2 : 0.06)}"/>` +
      `<ellipse cx="400" cy="760" rx="210" ry="34" fill="${shade(fill, light ? -0.06 : 0.12)}"/>` +
      `<ellipse cx="400" cy="760" rx="210" ry="34" fill="url(#light)" opacity="0.6"/>`,
  );
  const inner = back
    ? `<path d="${mascotVector.fill}" fill="${fill}"/><path d="${mascotVector.d}" fill="${fill}"/>`
    : `<path d="${mascotVector.fill}" fill="${fill}"/><path d="${mascotVector.d}" fill="${line}"/>`;
  s.add(`<g filter="url(#embroidery)">${vectorAt(mascotVector, 150, 346, 500, inner)}</g>`);
  s.add(vectorAt(mascotVector, 150, 346, 500, `<path d="${mascotVector.fill}" fill="#000" opacity="0.5" filter="url(#inner-9)" style="mix-blend-mode:multiply"/>`));
  s.add(vectorAt(mascotVector, 150, 346, 500, `<path d="${mascotVector.fill}" fill="url(#light)"/>`, ' style="mix-blend-mode:soft-light"'));
  return { svg: s.toSVG(), detail: [240, 500, 320, 400] };
}

// ─── Monograma de escritorio ────────────────────────────────────────────────

function deskMonogram(colorId: string, back: boolean): Result {
  const s = new Scene('#1a1a1a');
  const light = colorId === 'blanco';
  const face = light ? '#efeee9' : '#1b1b1d';
  const side = light ? '#d6d5cf' : '#050506';
  const d = monogramVector.d;
  const flip = back ? ` transform="translate(${2 * 160 + 480} 0) scale(-1 1)"` : '';
  s.add(
    `<path d="M150,720 L650,720 L690,770 L110,770Z" fill="${light ? '#d9d8d2' : '#232325'}"/>` +
      `<path d="M110,770 L690,770 L690,792 L110,792Z" fill="${light ? '#b9b8b2' : '#121213'}"/>` +
      `<ellipse cx="400" cy="800" rx="320" ry="24" fill="#000" opacity="0.3" filter="url(#ground)"/>`,
  );
  s.add(`<g${flip}>${vectorAt(monogramVector, 166, 380, 480, `<path d="${d}" fill="${side}"/>`)}${vectorAt(monogramVector, 160, 376, 480, `<path d="${d}" fill="${face}"/>`)}</g>`);
  s.add(`<g${flip}>${vectorAt(monogramVector, 160, 376, 480, `<path d="${d}" fill="url(#light)"/>`, ' style="mix-blend-mode:soft-light"')}</g>`);
  s.add(`<ellipse cx="400" cy="722" rx="250" ry="6" fill="#000" opacity="0.35" filter="url(#contact)"/>`);
  return { svg: s.toSVG(), detail: [160, 340, 300, 375] };
}

// ─── Stickers troquelados ───────────────────────────────────────────────────

const VECTORS = { wordmark: wordmarkVector, monogram: monogramVector, star: starVector, mascot: mascotVector };
type StickerMark = keyof typeof VECTORS;

function stickerAt(mark: StickerMark, x: number, y: number, w: number, color: string, rotate: number, border = 14) {
  const v = VECTORS[mark];
  const h = (w * v.height) / v.width;
  const inner = mark === 'mascot' ? `<path d="${mascotVector.fill}" fill="${INK_DARK}"/><path d="${v.d}" fill="${INK_LIGHT}"/>` : `<path d="${v.d}" fill="${color}"/>`;
  return `<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})" filter="url(#diecut-${border})">${vectorAt(v, x, y, w, inner)}</g>`;
}

const diecut = (r: number) => `<filter id="diecut-${r}" x="-25%" y="-25%" width="150%" height="150%">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="grow"/>
  <feGaussianBlur in="grow" stdDeviation="1" result="soft"/>
  <feComponentTransfer in="soft" result="edge"><feFuncA type="linear" slope="6" intercept="-2"/></feComponentTransfer>
  <feFlood flood-color="#fbfbf8"/><feComposite in2="edge" operator="in" result="border"/>
  <feGaussianBlur in="edge" stdDeviation="6" result="sb"/><feOffset in="sb" dy="6" result="so"/>
  <feFlood flood-color="#000" flood-opacity="0.28"/><feComposite in2="so" operator="in" result="shadow"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;

function sticker(product: Product, back: boolean): Result {
  const s = new Scene('#f3f3f0', { background: back ? 'dark' : 'studio' });
  s.def(diecut(14));
  s.def(diecut(10));
  let body = '';
  if (product.artwork === 'wordmark') {
    body =
      stickerAt('wordmark', 150, 170, 440, INK_DARK, -4) +
      stickerAt('monogram', 470, 380, 190, RED, 8, 12) +
      stickerAt('star', 120, 380, 330, INK_DARK, -10, 12) +
      stickerAt('mascot', 300, 520, 250, INK_DARK, 5, 12) +
      stickerAt('star', 560, 640, 150, RED, 14, 10) +
      stickerAt('monogram', 110, 690, 170, INK_DARK, -8, 10);
  } else if (product.artwork === 'mascot') {
    body = stickerAt('mascot', 190, 300, 420, INK_DARK, -4);
  } else {
    body = stickerAt('star', 120, 330, 560, RED, -8);
  }
  if (back) {
    // Sobre el papel de soporte, en una superficie oscura.
    s.add(`<rect x="110" y="140" width="580" height="720" rx="18" fill="#efeee9" filter="url(#embroidery)"/><rect x="110" y="140" width="580" height="720" rx="18" fill="url(#light)" opacity="0.5"/>`);
  }
  s.add(back ? `<g transform="translate(400 500) scale(0.82) translate(-400 -500)">${body}</g>` : body);
  return { svg: s.toSVG(), detail: product.artwork === 'wordmark' ? [120, 140, 320, 400] : [220, 300, 320, 400] };
}

export { W, H, sym };
