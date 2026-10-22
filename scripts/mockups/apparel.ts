/**
 * Prendas en dibujo plano técnico (tech pack): camisetas, manga larga, sudaderas y pantalones.
 * Siluetas oversize y cuadradas con hombro caído. Coordenadas en el espacio de diseño (≈800×1000);
 * las mitades se reflejan con `sym`/`mirror` y `Scene.toSVG` encuadra la pieza en su caja segura.
 *
 * La etiqueta tejida roja HYPSOS va siempre en la costura lateral izquierda junto al bajo
 * (vista frontal, a la izquierda de la imagen); en la espalda aparece en la misma costura física.
 */
import { type Box, type Curve, INK_DARK, INK_LIGHT, mirror, mirrorCurve, type Pt, Scene, shade, sym, type PrintOptions } from './kit';

export type { Box };

/** Gráficos de cada prenda por vista. */
export type PrintSpec = (scene: Scene) => Omit<PrintOptions, 'color'> & { color?: string };
export interface ApparelSpec {
  front?: PrintSpec[];
  back?: PrintSpec[];
  /** Zona ampliada en la vista de detalle (espacio de diseño, proporción 4:5). */
  detail: Box;
  cords?: boolean;
}

type View = 'front' | 'back';

const ink = (scene: Scene) => (scene.dark ? INK_LIGHT : INK_DARK);
function applyPrints(scene: Scene, prints: PrintSpec[] | undefined) {
  for (const spec of prints ?? []) {
    const o = spec(scene);
    scene.print({ ...o, color: o.color ?? ink(scene) });
  }
}

const rev = (c: Curve): Curve => [c[3], c[2], c[1], c[0]];
/** Curva izquierda (hacia el centro) + su reflejo (desde el centro hacia la derecha). */
const both = (c: Curve): Curve[] => [c, rev(mirrorCurve(c))];
const line = (a: Pt, b: Pt): Curve => [a, [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + (2 * (b[0] - a[0])) / 3, a[1] + (2 * (b[1] - a[1])) / 3], b];

/** Interior visible por el escote o la capucha: un tono más profundo que el tejido. */
const inside = (scene: Scene) => (scene.dark ? shade(scene.fabric, -0.45) : shade(scene.fabric, -0.22));

/** Etiqueta roja en la costura lateral izquierda (frente) o en la misma costura vista desde la espalda. */
function sideTab(scene: Scene, view: View, x: number, y: number, angle = 0) {
  if (view === 'front') scene.tab(x, y, -1, { angle });
  else scene.tab(800 - x, y, 1, { angle: -angle });
}

// ─── Cuello de canalé (camisetas) ───────────────────────────────────────────

const NECK_TOP: Curve = [[316, 168], [338, 174], [368, 178], [400, 178]];
const NECK_BACK_IN: Curve = [[336, 172], [356, 186], [378, 196], [400, 196]];
const NECK_FRONT_OUT: Curve = [[316, 168], [320, 224], [356, 248], [400, 248]];
const NECK_FRONT_IN: Curve = [[336, 172], [342, 212], [368, 226], [400, 226]];
const NECK_BACK_SEAM: Curve = [[318, 174], [342, 190], [370, 198], [400, 198]];

function crewNeck(scene: Scene, view: View) {
  if (view === 'front') {
    // Interior de la espalda visto por el escote, tapeta trasera y canalé delantero.
    const hole = `M336,172 C356,186 378,196 400,196 C422,196 444,186 464,172 C458,212 432,226 400,226 C368,226 342,212 336,172Z`;
    scene.part(hole, { fill: inside(scene), silhouette: false });
    scene.rib(both(NECK_TOP), both(NECK_BACK_IN), { spacing: 5 });
    scene.rib(both(NECK_FRONT_OUT), both(NECK_FRONT_IN), { spacing: 5.5 });
    scene.stitchAlong(NECK_FRONT_OUT, 5);
    scene.stitchAlong(rev(mirrorCurve(NECK_FRONT_OUT)), 5);
  } else {
    scene.rib(both(NECK_TOP), both(NECK_BACK_SEAM), { spacing: 5 });
    scene.stitchAlong(NECK_BACK_SEAM, -5, 0.08, 1);
    scene.stitchAlong(rev(mirrorCurve(NECK_BACK_SEAM)), -5, 0, 0.92);
  }
}

// ─── Camiseta oversize (hombro caído, manga corta ancha) ────────────────────

const TEE = sym(
  [400, 178],
  [
    { c: [[368, 178], [338, 174]], to: [316, 168] },
    { c: [[262, 182], [190, 198]], to: [142, 210] },
    { c: [[110, 254], [80, 304]], to: [56, 352] },
    { c: [[84, 378], [110, 404]], to: [136, 430] },
    { c: [[144, 424], [151, 418]], to: [158, 412] },
    { c: [[158, 560], [158, 700]], to: [158, 838] },
    { c: [[240, 845], [326, 848]], to: [400, 848] },
  ],
);

export function tee(scene: Scene, view: View, spec: ApparelSpec) {
  scene.part(TEE);
  // Costura de hombro caído y dobladillos con pespunte doble.
  for (const t of [(d: string) => d, mirror]) {
    scene.seam(t('M142,210 C154,272 158,344 158,412'));
    scene.stitch(t('M63,341 C88,366 116,394 145,421'));
    scene.stitch(t('M67,334 C92,359 120,387 150,416'));
  }
  scene.stitch('M161,824 C240,831 326,834 400,834 C474,834 560,831 639,824');
  scene.stitch('M161,817 C240,824 326,827 400,827 C474,827 560,824 639,817');
  crewNeck(scene, view);
  sideTab(scene, view, 158, 790);
  applyPrints(scene, view === 'front' ? spec.front : spec.back);
}

// ─── Camiseta de manga larga (hombro caído, puños de canalé) ────────────────

const LS = sym(
  [400, 178],
  [
    { c: [[368, 178], [338, 174]], to: [316, 168] },
    { c: [[262, 182], [198, 196]], to: [152, 208] },
    { c: [[116, 232], [100, 300]], to: [94, 400] },
    { c: [[88, 560], [82, 690]], to: [80, 782] },
    { to: [84, 848] },
    { to: [146, 852] },
    { to: [148, 786] },
    { c: [[154, 640], [162, 500]], to: [170, 404] },
    { to: [172, 862] },
    { c: [[250, 868], [330, 870]], to: [400, 870] },
  ],
);

export function longsleeve(scene: Scene, view: View, spec: ApparelSpec) {
  scene.part(LS);
  for (const t of [(c: Curve) => c, mirrorCurve]) {
    scene.rib(t([[80, 782], [106, 783], [128, 785], [148, 786]]), t([[84, 848], [104, 849], [126, 851], [146, 852]]), { spacing: 5 });
  }
  scene.seam('M152,208 C162,280 168,340 170,404');
  scene.seam(mirror('M152,208 C162,280 168,340 170,404'));
  scene.stitch('M174,855 C250,861 330,863 400,863 C470,863 550,861 626,855');
  scene.stitch('M174,848 C250,854 330,856 400,856 C470,856 550,854 626,848');
  crewNeck(scene, view);
  sideTab(scene, view, 172, 812);
  applyPrints(scene, view === 'front' ? spec.front : spec.back);
}

// ─── Sudadera con capucha (oversize, capucha alzada detrás del cuello) ──────

const HOODIE = sym(
  [400, 90],
  [
    { c: [[326, 90], [276, 140]], to: [274, 208] },
    { c: [[273, 236], [284, 252]], to: [302, 258] },
    { c: [[250, 270], [190, 284]], to: [144, 296] },
    { c: [[106, 322], [90, 400]], to: [84, 520] },
    { c: [[80, 640], [76, 720]], to: [76, 786] },
    { to: [80, 856] },
    { to: [150, 860] },
    { to: [152, 790] },
    { c: [[160, 660], [170, 520]], to: [180, 438] },
    { c: [[184, 560], [186, 720]], to: [188, 826] },
    { to: [194, 898] },
    { c: [[270, 902], [340, 904]], to: [400, 904] },
  ],
);
const HOOD_OPEN_L: Curve[] = [
  [[400, 150], [358, 150], [336, 184], [335, 228]],
  [[335, 228], [335, 268], [362, 302], [400, 330]],
];
const POCKET = 'M290,598 L510,598 C522,640 540,684 566,716 L568,812 L232,812 L234,716 C260,684 278,640 290,598Z';
const POCKET_OPEN: Curve = [[290, 598], [278, 640], [260, 684], [234, 716]];

export function hoodie(scene: Scene, view: View, spec: ApparelSpec) {
  scene.part(HOODIE);
  // Puños y bajo de canalé 2×2.
  for (const t of [(c: Curve) => c, mirrorCurve]) {
    scene.rib(t([[76, 786], [102, 787], [128, 789], [152, 790]]), t([[80, 856], [104, 857], [128, 859], [150, 860]]), { spacing: 5 });
  }
  scene.rib(both([[188, 826], [260, 830], [330, 831], [400, 831]]), both([[194, 898], [270, 902], [340, 904], [400, 904]]), { spacing: 5.5 });
  scene.seam('M144,296 C160,350 172,400 180,438');
  scene.seam(mirror('M144,296 C160,350 172,400 180,438'));

  if (view === 'front') {
    // Unión capucha-cuerpo y abertura de la capucha (interior oscuro) con su vivo de doble capa.
    scene.seam('M302,258 C318,302 356,338 400,348 C444,338 482,302 498,258');
    const open = `M400,150 C358,150 336,184 335,228 C335,268 362,302 400,330 C438,302 465,268 465,228 C464,184 442,150 400,150Z`;
    scene.part(open, { fill: inside(scene), silhouette: false });
    for (const c of HOOD_OPEN_L) {
      scene.stitchAlong(c, 9);
      scene.stitchAlong(mirrorCurve(c), -9);
    }
    // Pinza de la capucha (costura lateral) y bolsillo canguro.
    scene.seam('M284,168 C302,138 332,120 368,114');
    scene.seam(mirror('M284,168 C302,138 332,120 368,114'));
    scene.part(POCKET, { silhouette: false });
    scene.stitch('M297,606 L503,606');
    scene.stitchAlong(POCKET_OPEN, -7);
    scene.stitchAlong(mirrorCurve(POCKET_OPEN), 7);
    scene.stitch('M240,722 L240,804 L560,804 L560,722');
    if (spec.cords) {
      // Cordones planos con ojales y herretes.
      for (const [x1, x2] of [
        [364, 352],
        [436, 450],
      ]) {
        const d = `M${x1},318 C${x1 - 2},370 ${x2 + 4},424 ${x2},480`;
        scene.add(`<circle cx="${x1}" cy="318" r="5" fill="${inside(scene)}" stroke="${scene.outline}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`);
        scene.add(`<path d="${d}" fill="none" stroke="${scene.outline}" stroke-width="7.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
        scene.add(`<path d="${d}" fill="none" stroke="${scene.fabric}" stroke-width="4.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
        scene.add(`<rect x="${x2 - 4}" y="474" width="8" height="22" rx="2.5" fill="${scene.outline}"/>`);
      }
    }
  } else {
    // Capucha vista por detrás: costura central y unión con el escote trasero.
    scene.seam('M302,258 C336,276 368,284 400,284 C432,284 464,276 498,258');
    scene.seam('M400,92 L400,284');
    scene.stitch('M394,96 L394,282');
    scene.stitch('M406,96 L406,282');
  }
  sideTab(scene, view, 187, 800);
  applyPrints(scene, view === 'front' ? spec.front : spec.back);
}

// ─── Pantalones ─────────────────────────────────────────────────────────────

const JOGGER = sym(
  [400, 120],
  [
    { to: [226, 120] },
    { to: [222, 176] },
    { c: [[206, 220], [196, 270]], to: [196, 330] },
    { c: [[198, 520], [222, 700]], to: [240, 814] },
    { to: [244, 880] },
    { to: [346, 882] },
    { to: [350, 816] },
    { c: [[362, 660], [384, 500]], to: [400, 410] },
  ],
);
const CARGO = sym(
  [400, 120],
  [
    { to: [214, 120] },
    { to: [212, 172] },
    { c: [[200, 220], [192, 270]], to: [190, 330] },
    { c: [[182, 520], [172, 720]], to: [168, 890] },
    { c: [[240, 894], [320, 896]], to: [384, 894] },
    { c: [[388, 700], [392, 520]], to: [400, 430] },
  ],
);
const SHORTS = sym(
  [400, 250],
  [
    { to: [214, 250] },
    { to: [210, 306] },
    { c: [[196, 340], [184, 380]], to: [180, 430] },
    { c: [[174, 540], [166, 640]], to: [160, 712] },
    { c: [[236, 721], [320, 725]], to: [388, 722] },
    { c: [[390, 650], [394, 600]], to: [400, 560] },
  ],
);

function drawcord(scene: Scene, y: number, len = 110) {
  for (const [x1, x2] of [
    [390, 372],
    [410, 430],
  ]) {
    const d = `M${x1},${y} C${x1 + (x2 - x1) * 0.2},${y + len * 0.4} ${x2 - (x2 - x1) * 0.1},${y + len * 0.75} ${x2},${y + len}`;
    scene.add(`<circle cx="${x1}" cy="${y}" r="4" fill="${inside(scene)}" stroke="${scene.outline}" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`);
    scene.add(`<path d="${d}" fill="none" stroke="${scene.outline}" stroke-width="6.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
    scene.add(`<path d="${d}" fill="none" stroke="${scene.dark ? '#2a2826' : '#f2f2f0'}" stroke-width="3.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
    scene.add(`<rect x="${x2 - 3.5}" y="${y + len - 4}" width="7" height="18" rx="2.5" fill="${scene.outline}"/>`);
  }
}

function elasticWaist(scene: Scene, top: number, left: number, view: View) {
  const h = 56;
  scene.rib(both(line([left, top], [400, top])), both(line([left - 4, top + h], [400, top + h])), { spacing: 6 });
  scene.stitch(`M${left},${top + 8} L${800 - left},${top + 8}`);
  scene.stitch(`M${left - 3},${top + h - 8} L${800 - left + 3},${top + h - 8}`);
  if (view === 'front') drawcord(scene, top + 34);
}

export function pants(scene: Scene, view: View, spec: ApparelSpec, kind: 'jogger' | 'cargo' | 'shorts') {
  if (kind === 'jogger') {
    scene.part(JOGGER);
    elasticWaist(scene, 120, 226, view);
    for (const t of [(c: Curve) => c, mirrorCurve]) {
      scene.rib(t([[240, 814], [276, 815], [314, 816], [350, 816]]), t([[244, 880], [278, 881], [312, 882], [346, 882]]), { spacing: 5 });
    }
    scene.seam('M400,176 L400,410');
    if (view === 'front') {
      for (const t of [(d: string) => d, mirror]) {
        scene.seam(t('M228,180 C244,220 256,262 262,314'));
        scene.stitch(t('M236,180 C252,220 264,262 270,312'));
      }
    } else {
      // Bolsillo trasero con cremallera.
      scene.part('M436,256 L544,256 L544,266 L436,266Z', { fill: shade(scene.fabric, scene.dark ? 0.06 : -0.1), silhouette: false });
      scene.seam('M440,261 L540,261');
      scene.part('M530,258 L540,258 L540,284 L530,284Z', { fill: scene.outline, silhouette: false });
      scene.seam('M228,236 C300,252 360,260 400,262 C440,260 500,252 572,236');
    }
    sideTab(scene, view, 238, 790, -9);
  } else if (kind === 'cargo') {
    scene.part(CARGO);
    scene.part('M214,120 L586,120 L588,172 L212,172Z');
    scene.stitch('M216,127 L584,127');
    scene.stitch('M213,165 L587,165');
    scene.seam('M400,172 L400,430');
    const loops = view === 'front' ? [250, 330, 470, 550] : [250, 330, 400, 470, 550];
    for (const x of loops) {
      scene.part(`M${x - 7},${114} L${x + 7},${114} L${x + 7},${182} L${x - 7},${182}Z`, { silhouette: false });
      scene.stitch(`M${x - 4},119 L${x + 4},119`);
      scene.stitch(`M${x - 4},177 L${x + 4},177`);
    }
    if (view === 'front') {
      scene.add(`<circle cx="400" cy="146" r="8.5" fill="${shade(scene.fabric, scene.dark ? 0.12 : -0.15)}" stroke="${scene.outline}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`);
      scene.stitch('M420,176 L420,360 C420,384 412,396 400,404');
    }
    for (const flip of [false, true]) {
      const t = (d: string) => (flip ? mirror(d) : d);
      if (view === 'front') {
        scene.seam(t('M218,178 C246,220 262,262 268,320'));
        scene.stitch(t('M226,178 C254,220 270,262 276,318'));
      } else {
        // Canesú y bolsillos traseros de plastrón con solapa.
        scene.seam(t('M212,232 C300,250 360,262 400,268'));
        scene.part(t('M254,300 L366,300 L362,428 L258,428Z'), { silhouette: false });
        scene.stitch(t('M262,420 L358,420'));
        scene.part(t('M248,290 L372,290 L370,338 L250,338Z'), { silhouette: false });
        scene.stitch(t('M254,330 L366,330'));
      }
      // Bolsillos cargo con fuelle y solapa sobre la costura lateral.
      scene.part(t('M184,470 L290,470 L292,640 L188,642Z'), { silhouette: false });
      scene.seam(t('M194,478 L280,478 L282,632 L198,634Z'));
      scene.stitch(t('M190,628 L286,626'));
      scene.part(t('M180,452 L294,452 L294,502 L182,504Z'), { silhouette: false });
      scene.stitch(t('M186,496 L289,494'));
      scene.add(`<circle cx="${flip ? 562 : 238}" cy="480" r="4.5" fill="${shade(scene.fabric, scene.dark ? 0.12 : -0.15)}" stroke="${scene.outline}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`);
      // Rodilla articulada: costura y pinzas.
      scene.seam(t('M175,704 C240,720 330,720 388,704'));
      scene.seam(t('M222,716 L228,748'));
      scene.seam(t('M338,716 L334,746'));
      // Bajo ajustable con cordón y tanca.
      scene.stitch(t('M171,872 C240,876 320,878 386,876'));
      scene.add(
        `<path d="${t('M180,888 C176,902 172,914 170,930')}" fill="none" stroke="${scene.outline}" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` +
          `<rect x="${flip ? 800 - 178 : 162}" y="914" width="16" height="22" rx="5" fill="${scene.outline}"/>`,
      );
      scene.silhouette(t('M162,914 L178,914 L178,936 L162,936Z'));
    }
    sideTab(scene, view, 170, 842, -1);
  } else {
    scene.part(SHORTS);
    elasticWaist(scene, 250, 214, view);
    scene.seam('M400,306 L400,560');
    for (const t of [(d: string) => d, mirror]) {
      if (view === 'front') {
        scene.seam(t('M212,316 C228,356 232,398 228,452'));
        scene.stitch(t('M220,316 C236,356 240,398 236,450'));
      }
      scene.stitch(t('M164,694 C236,703 320,707 388,704'));
    }
    sideTab(scene, view, 163, 676, 5);
  }
  applyPrints(scene, view === 'front' ? spec.front : spec.back);
}

