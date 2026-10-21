/**
 * Prendas en flat lay (vista cenital de estudio): camisetas, manga larga, sudaderas y pantalones.
 * Coordenadas en el lienzo de 800×1000; las mitades se reflejan con `sym`/`mirror`.
 */
import { INK_DARK, INK_LIGHT, mirror, Scene, shade, sym, type PrintOptions } from './kit';

export type Box = [number, number, number, number];

/** Gráficos de cada prenda por vista. */
export type PrintSpec = (scene: Scene) => Omit<PrintOptions, 'color'> & { color?: string };
export interface ApparelSpec {
  front?: PrintSpec[];
  back?: PrintSpec[];
  /** Zona ampliada en la vista de detalle. */
  detail: Box;
  cords?: boolean;
}

const ink = (scene: Scene) => (scene.dark ? INK_LIGHT : INK_DARK);
function applyPrints(scene: Scene, prints: PrintSpec[] | undefined) {
  for (const spec of prints ?? []) {
    const o = spec(scene);
    scene.print({ ...o, color: o.color ?? ink(scene) });
  }
}

// ─── Camiseta oversize (hombro caído) ───────────────────────────────────────

const TEE_FRONT = sym(
  [400, 170],
  [
    { c: [[372, 170], [338, 166]], to: [316, 156] },
    { c: [[282, 172], [220, 188]], to: [176, 200] },
    { c: [[138, 240], [96, 322]], to: [64, 410] },
    { c: [[100, 426], [140, 442]], to: [180, 454] },
    { c: [[188, 438], [194, 420]], to: [200, 400] },
    { c: [[205, 560], [199, 720]], to: [196, 864] },
    { c: [[262, 869], [332, 871]], to: [400, 870] },
  ],
);

function teeCollarFront(scene: Scene) {
  // Interior de la espalda visible por el escote, tapeta trasera y cuello de canalé delantero.
  scene.part('M316,156 C336,170 370,184 400,184 C430,184 464,170 484,156 C474,184 440,206 400,206 C360,206 326,184 316,156Z', {
    fill: '#000',
    inner: 0.2,
    silhouette: false,
    outline: 0,
  });
  scene.add(`<path d="M316,156 C336,170 370,184 400,184 C430,184 464,170 484,156 C474,184 440,206 400,206 C360,206 326,184 316,156Z" fill="${scene.fabric}" opacity="0.55"/>`);
  scene.label(388, 188, 24, 11, scene.dark ? '#e9e9e6' : '#1a1a1a');
  scene.rib('M316,156 C338,166 370,170 400,170 C430,170 462,166 484,156 C464,172 430,184 400,184 C370,184 336,172 316,156Z', 0);
  scene.rib('M300,160 C306,198 350,226 400,226 C450,226 494,198 500,160 L484,156 C474,184 440,206 400,206 C360,206 326,184 316,156Z', 90);
  scene.stitch('M302,166 C312,204 352,232 400,232 C448,232 488,204 498,166');
}

function teeFrontDetails(scene: Scene, long = false) {
  if (!long) {
    scene.seam('M184,204 C192,270 198,340 202,402');
    scene.seam(mirror('M184,204 C192,270 198,340 202,402'));
    scene.stitch('M76,392 C110,408 148,422 186,436');
    scene.stitch(mirror('M76,392 C110,408 148,422 186,436'));
  }
  scene.stitch('M200,842 C262,847 332,849 400,848 C468,849 538,847 600,842');
  scene.fold('M214,424 C252,452 290,474 336,498', 1, 14);
  scene.fold('M590,430 C560,462 520,486 474,506', 0.8, 12);
  scene.fold('M232,690 C292,676 352,700 420,690', 0.7, 16);
  scene.fold('M420,772 C480,758 540,782 592,770', 0.6, 14);
  scene.fold('M262,560 C300,600 318,640 330,700', 0.45, 10);
  scene.fold('M120,300 C138,334 150,366 162,404', 0.6, 10);
  scene.fold(mirror('M128,296 C144,330 156,360 166,398'), 0.5, 10);
}

export function tee(scene: Scene, view: 'front' | 'back', spec: ApparelSpec) {
  scene.part(TEE_FRONT);
  if (view === 'front') {
    teeCollarFront(scene);
    teeFrontDetails(scene);
    applyPrints(scene, spec.front);
  } else {
    scene.rib('M316,156 C338,166 370,170 400,170 C430,170 462,166 484,156 L486,172 C464,182 430,188 400,188 C370,188 336,182 314,172Z', 90);
    scene.stitch('M314,178 C336,188 370,194 400,194 C430,194 464,188 486,178');
    teeFrontDetails(scene);
    applyPrints(scene, spec.back);
  }
}

// ─── Camiseta de manga larga ────────────────────────────────────────────────

const LS_BODY = sym(
  [400, 172],
  [
    { c: [[372, 172], [340, 168]], to: [318, 158] },
    { c: [[286, 172], [234, 186]], to: [196, 198] },
    { c: [[150, 290], [104, 520]], to: [84, 742] },
    { c: [[110, 750], [136, 756]], to: [160, 758] },
    { c: [[176, 600], [200, 470]], to: [214, 396] },
    { c: [[218, 560], [214, 720]], to: [212, 868] },
    { c: [[272, 872], [336, 874]], to: [400, 873] },
  ],
);

export function longsleeve(scene: Scene, view: 'front' | 'back', spec: ApparelSpec) {
  scene.part(LS_BODY);
  // Puños de canalé.
  scene.rib('M84,742 C110,750 136,756 160,758 L158,818 C132,816 106,810 80,800Z', 6);
  scene.rib(mirror('M84,742 C110,750 136,756 160,758 L158,818 C132,816 106,810 80,800Z'), -6);
  scene.seam('M206,204 C210,270 212,340 214,398');
  scene.seam(mirror('M206,204 C210,270 212,340 214,398'));
  if (view === 'front') {
    teeCollarFront(scene);
    applyPrints(scene, spec.front);
  } else {
    scene.rib('M318,158 C338,166 370,170 400,170 C430,170 462,166 482,158 L484,174 C464,182 430,188 400,188 C370,188 336,182 316,174Z', 90);
    applyPrints(scene, spec.back);
  }
  scene.stitch('M214,846 C272,850 336,852 400,851 C464,852 528,850 586,846');
  scene.fold('M150,420 C138,500 128,580 120,660', 0.7, 12);
  scene.fold(mirror('M156,430 C144,510 132,590 126,670'), 0.6, 12);
  scene.fold('M232,430 C270,460 300,482 340,500', 0.8, 12);
  scene.fold('M248,700 C306,688 362,708 430,698', 0.6, 14);
  scene.fold('M440,780 C500,768 548,788 590,780', 0.5, 12);
}

// ─── Sudadera con capucha ───────────────────────────────────────────────────

const HOODIE_HOOD = 'M262,236 C250,150 300,82 400,80 C500,82 550,150 538,236 C500,250 460,256 400,256 C340,256 300,250 262,236Z';
const HOODIE_BODY = sym(
  [400, 232],
  [
    { c: [[366, 232], [330, 224]], to: [304, 214] },
    { c: [[262, 226], [214, 240]], to: [176, 254] },
    { c: [[128, 360], [84, 560]], to: [60, 748] },
    { c: [[90, 760], [122, 768]], to: [150, 772] },
    { c: [[168, 620], [188, 500]], to: [200, 440] },
    { c: [[204, 600], [200, 720]], to: [198, 838] },
    { c: [[264, 842], [332, 843]], to: [400, 843] },
  ],
);
const HOODIE_HEM = sym(
  [400, 838],
  [
    { c: [[330, 838], [262, 837]], to: [198, 836] },
    { to: [208, 906] },
    { c: [[270, 910], [334, 912]], to: [400, 912] },
  ],
);
const HOODIE_CUFF = 'M60,748 C90,760 122,768 150,772 L148,836 C118,832 86,824 54,812Z';
const POCKET = 'M296,606 L504,606 C516,650 534,700 556,740 L556,800 L244,800 L244,740 C266,700 284,650 296,606Z';

export function hoodie(scene: Scene, view: 'front' | 'back', spec: ApparelSpec) {
  if (view === 'front') {
    scene.part(HOODIE_HOOD);
  }
  scene.part(HOODIE_BODY);
  scene.rib(HOODIE_HEM, 90);
  scene.rib(HOODIE_CUFF, 4);
  scene.rib(mirror(HOODIE_CUFF), -4);
  scene.seam('M188,258 C194,320 198,380 202,442');
  scene.seam(mirror('M188,258 C194,320 198,380 202,442'));

  if (view === 'front') {
    // Capucha tumbada detrás: se ve su interior (forro en sombra) rodeado por el borde de doble capa.
    const lining = 'M292,238 C286,168 328,112 400,110 C472,112 514,168 508,238 C470,266 432,282 400,286 C368,282 330,266 292,238Z';
    scene.part(lining, { fill: shade(scene.fabric, scene.dark ? -0.45 : -0.3), inner: 0.6, blur: 16, silhouette: false, outline: 0.3 });
    scene.add(`<path d="${lining}" fill="none" stroke="${shade(scene.fabric, scene.dark ? 0.1 : -0.06)}" stroke-width="10" opacity="0.9"/>`);
    scene.stitch('M300,236 C296,172 334,122 400,120 C466,122 504,172 500,236');
    // Solapas delanteras de la capucha cruzadas sobre el escote.
    const flap = 'M292,238 C330,262 366,280 404,292 L412,312 C368,300 324,282 286,256Z';
    scene.part(flap, { inner: scene.dark ? 0.5 : 0.3, blur: 6, silhouette: false });
    scene.part(mirror(flap), { inner: scene.dark ? 0.5 : 0.3, blur: 6, silhouette: false });
    if (spec.cords) {
      for (const [x1, x2] of [
        [376, 360],
        [424, 446],
      ]) {
        scene.add(
          `<path d="M${x1},282 C${x1 - 4},340 ${x2 + 6},400 ${x2},470" fill="none" stroke="${scene.dark ? '#111' : '#d9d8d4'}" stroke-width="7" stroke-linecap="round" filter="url(#embroidery)"/>` +
            `<path d="M${x1},282 C${x1 - 4},340 ${x2 + 6},400 ${x2},470" fill="none" stroke="${scene.dark ? '#2b2b2d' : '#f5f4f0'}" stroke-width="4" stroke-linecap="round"/>` +
            `<rect x="${x2 - 4.5}" y="466" width="9" height="26" rx="3" fill="${scene.dark ? '#0b0b0b' : '#222'}"/>`,
        );
      }
    }
    // Bolsillo canguro.
    scene.part(POCKET, { inner: scene.dark ? 0.45 : 0.26, blur: 7, silhouette: false });
    scene.add(
      `<path d="M296,606 C284,650 266,700 244,740" fill="none" stroke="#000" stroke-width="7" opacity="0.38" filter="url(#fold-blur)" clip-path="url(#${scene.clipId})"/>` +
        `<path d="${mirror('M296,606 C284,650 266,700 244,740')}" fill="none" stroke="#000" stroke-width="7" opacity="0.38" filter="url(#fold-blur)" clip-path="url(#${scene.clipId})"/>`,
    );
    scene.stitch('M302,616 L498,616');
    scene.stitch('M290,612 C278,656 262,702 238,744');
    scene.stitch(mirror('M290,612 C278,656 262,702 238,744'));
    applyPrints(scene, spec.front);
  } else {
    // Capucha plegada sobre la espalda.
    scene.part('M268,226 C258,170 300,128 400,124 C500,128 542,170 532,226 C540,330 520,400 400,414 C280,400 260,330 268,226Z', {
      inner: scene.dark ? 0.42 : 0.3,
      blur: 12,
      silhouette: false,
    });
    scene.seam('M400,128 C402,220 401,320 400,412');
    scene.fold('M300,250 C320,300 330,340 340,390', 0.6, 12);
    applyPrints(scene, spec.back);
  }
  scene.fold('M140,420 C126,500 114,580 104,660', 0.7, 12);
  scene.fold(mirror('M144,430 C130,510 118,590 108,670'), 0.6, 12);
  scene.fold('M216,470 C250,500 280,520 320,536', 0.8, 14);
  scene.fold(mirror('M216,480 C250,510 284,528 324,544'), 0.7, 14);
  scene.fold('M240,560 C300,552 350,570 410,560', 0.4, 14);
}

// ─── Pantalones ─────────────────────────────────────────────────────────────

const JOGGER = sym(
  [400, 118],
  [
    { to: [214, 118] },
    { c: [[206, 300], [214, 600]], to: [236, 828] },
    { c: [[270, 832], [318, 834]], to: [350, 832] },
    { c: [[364, 640], [382, 420]], to: [400, 330] },
  ],
);
const CARGO = sym(
  [400, 112],
  [
    { to: [200, 112] },
    { c: [[186, 320], [176, 620]], to: [170, 900] },
    { c: [[230, 904], [300, 906]], to: [362, 904] },
    { c: [[372, 680], [386, 440]], to: [400, 334] },
  ],
);
const SHORTS = sym(
  [400, 222],
  [
    { to: [206, 222] },
    { c: [[196, 360], [180, 520]], to: [164, 668] },
    { c: [[230, 684], [300, 690]], to: [372, 684] },
    { c: [[380, 600], [390, 500]], to: [400, 436] },
  ],
);

export function pants(scene: Scene, view: 'front' | 'back', spec: ApparelSpec, kind: 'jogger' | 'cargo' | 'shorts') {
  const body = kind === 'jogger' ? JOGGER : kind === 'cargo' ? CARGO : SHORTS;
  const top = kind === 'shorts' ? 222 : kind === 'cargo' ? 112 : 118;
  const left = kind === 'shorts' ? 206 : kind === 'cargo' ? 200 : 214;
  scene.part(body);
  // Cintura: elástico fruncido con cordón (jogger y short) o pretina con trabillas (cargo).
  const band = `M${left},${top} L${800 - left},${top} L${800 - left + 2},${top + 58} L${left - 2},${top + 58}Z`;
  if (kind === 'cargo') {
    scene.part(band, { inner: scene.dark ? 0.5 : 0.28, blur: 5 });
    scene.stitch(`M${left + 2},${top + 8} L${800 - left - 2},${top + 8}`);
    scene.stitch(`M${left},${top + 50} L${800 - left},${top + 50}`);
    for (const x of [250, 330, 470, 550]) scene.part(`M${x - 7},${top - 4} L${x + 7},${top - 4} L${x + 7},${top + 64} L${x - 7},${top + 64}Z`, { inner: 0.4, blur: 3, silhouette: false });
    scene.add(`<circle cx="400" cy="${top + 29}" r="9" fill="${scene.dark ? '#2a2a2a' : '#cfcfcb'}" stroke="#000" stroke-opacity="0.4"/>`);
    scene.seam(`M400,${top + 58} C402,${top + 120} 400,${top + 170} 392,${top + 214}`);
    scene.stitch(`M412,${top + 60} C414,${top + 120} 412,${top + 168} 404,${top + 206}`);
  } else {
    scene.rib(band, 90);
    for (let x = left + 18; x < 800 - left; x += 26) scene.fold(`M${x},${top + 4} L${x + 3},${top + 54}`, 0.35, 5);
    if (view === 'front') {
      scene.add(
        `<path d="M388,${top + 40} C376,${top + 90} 360,${top + 140} 352,${top + 190}" fill="none" stroke="${scene.dark ? '#d8d8d4' : '#1f1f1f'}" stroke-width="5" stroke-linecap="round" filter="url(#embroidery)"/>` +
          `<path d="M412,${top + 40} C426,${top + 96} 440,${top + 150} 446,${top + 200}" fill="none" stroke="${scene.dark ? '#d8d8d4' : '#1f1f1f'}" stroke-width="5" stroke-linecap="round" filter="url(#embroidery)"/>`,
      );
    }
  }
  scene.seam(`M400,${top + 60} C400,${top + 160} 400,${top + 220} 400,${kind === 'shorts' ? 436 : 334}`);

  if (kind === 'jogger') {
    scene.rib('M236,828 C270,832 318,834 350,832 L352,890 C318,892 272,892 240,888Z', 90);
    scene.rib(mirror('M236,828 C270,832 318,834 350,832 L352,890 C318,892 272,892 240,888Z'), 90);
    // Bolsillos laterales en diagonal.
    scene.seam('M222,200 C250,250 262,300 266,340');
    scene.seam(mirror('M222,200 C250,250 262,300 266,340'));
    scene.fold('M250,500 C262,560 270,620 268,700', 0.6, 14);
    scene.fold(mirror('M246,520 C258,580 266,640 262,720'), 0.5, 14);
    scene.fold('M240,780 C270,790 310,792 340,786', 0.7, 10);
    scene.fold(mirror('M244,770 C274,782 312,786 342,778'), 0.6, 10);
  } else if (kind === 'cargo') {
    // Bolsillos cargo con fuelle y solapa en ambas perneras.
    for (const flip of [false, true]) {
      const t = (d: string) => (flip ? mirror(d) : d);
      scene.part(t('M196,470 L292,470 L294,640 L198,642Z'), { inner: scene.dark ? 0.55 : 0.3, blur: 6, silhouette: false });
      scene.part(t('M192,456 L296,456 L296,500 L194,502Z'), { inner: scene.dark ? 0.6 : 0.34, blur: 4, silhouette: false });
      scene.stitch(t('M204,632 L288,630'));
      scene.add(`<rect x="${flip ? 800 - 250 : 238}" y="484" width="12" height="7" rx="2" fill="${scene.dark ? '#333' : '#bbb'}"/>`);
      scene.seam(t('M222,200 C250,250 262,300 266,340'));
      scene.fold(t('M220,700 C240,760 250,820 250,880'), 0.6, 16);
      scene.fold(t('M300,690 C320,720 336,760 346,820'), 0.4, 12);
    }
    scene.stitch('M176,872 C232,876 300,878 360,876');
    scene.stitch(mirror('M176,872 C232,876 300,878 360,876'));
  } else {
    scene.stitch('M168,646 C232,662 302,666 370,662');
    scene.stitch(mirror('M168,646 C232,662 302,666 370,662'));
    scene.seam('M222,300 C246,340 256,380 260,420');
    scene.seam(mirror('M222,300 C246,340 256,380 260,420'));
    scene.fold('M230,520 C262,560 290,600 300,650', 0.6, 14);
    scene.fold(mirror('M236,500 C264,540 292,590 304,640'), 0.5, 14);
  }
  if (view === 'back' && kind === 'jogger') {
    // Bolsillo trasero con cremallera.
    scene.add(
      `<rect x="452" y="230" width="104" height="8" rx="2" fill="#000" opacity="0.5"/><rect x="452" y="231" width="104" height="5" fill="url(#weave)" opacity="0.6"/><rect x="546" y="226" width="12" height="18" rx="2" fill="${scene.dark ? '#3a3a3a' : '#9a9a96'}"/>`,
    );
  }
  applyPrints(scene, view === 'front' ? spec.front : spec.back);
}
