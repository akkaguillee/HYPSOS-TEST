/**
 * Qué se dibuja para cada producto: tipo de pieza, gráficos por vista y zona de detalle.
 * Los gráficos son siempre las marcas oficiales, colocadas como se describen en la ficha.
 */
import type { MediaView, Product } from '../../shared/types';
import { hoodie, longsleeve, pants, tee, type ApparelSpec, type Box } from './apparel';
import { accessory } from './accessories';
import { FABRIC, H, INK_DARK, INK_LIGHT, Scene, shade, W } from './kit';

const RED_INK = '#c8102e';
const toneOnTone = (scene: Scene) => shade(scene.fabric, scene.dark ? 0.16 : -0.12);

const apparel: Record<string, ApparelSpec> = {
  'p-tee-ascenso': {
    front: [() => ({ mark: 'monogram', x: 340, y: 286, w: 120, technique: 'screen' })],
    detail: [250, 200, 300, 375],
  },
  'p-tee-signal': {
    front: [() => ({ mark: 'star', x: 446, y: 276, w: 96, technique: 'screen', color: RED_INK, rotate: -6 })],
    back: [() => ({ mark: 'star', x: 196, y: 300, w: 408, technique: 'screen', color: RED_INK, rotate: -6 })],
    detail: [380, 220, 220, 275],
  },
  'p-tee-mascot': {
    front: [() => ({ mark: 'mascot', x: 290, y: 268, w: 220, technique: 'screen' })],
    detail: [250, 220, 300, 375],
  },
  'p-ls-base': {
    front: [(s) => ({ mark: 'monogram', x: 452, y: 288, w: 48, technique: 'embroidery', color: toneOnTone(s) })],
    detail: [380, 220, 180, 225],
  },
  'p-hoodie-ascenso': {
    front: [() => ({ mark: 'wordmark', x: 316, y: 340, w: 168, technique: 'embroidery' })],
    detail: [270, 270, 260, 325],
  },
  'p-hoodie-monogram': {
    back: [() => ({ mark: 'monogram', x: 214, y: 452, w: 372, technique: 'screen' })],
    detail: [250, 420, 300, 375],
  },
  'p-hoodie-base': {
    front: [() => ({ mark: 'monogram', x: 450, y: 330, w: 46, technique: 'embroidery' })],
    detail: [380, 260, 180, 225],
    cords: true,
  },
  'p-jogger-tecnico': {
    front: [() => ({ mark: 'monogram', x: 486, y: 290, w: 42, technique: 'embroidery' })],
    detail: [420, 200, 180, 225],
  },
  'p-cargo-altura': {
    front: [() => ({ mark: 'monogram', x: 230, y: 410, w: 30, technique: 'woven', color: RED_INK })],
    detail: [170, 360, 180, 225],
  },
  'p-short-training': {
    front: [() => ({ mark: 'monogram', x: 488, y: 560, w: 40, technique: 'screen' })],
    detail: [420, 480, 180, 225],
  },
};

export interface MockupJob {
  product: Product;
  colorId: string;
  view: MediaView;
}

/** Devuelve el SVG del mockup (lienzo 800×1000) para una variante y vista. */
export function mockupSVG({ product, colorId, view }: MockupJob): string {
  const fabric = FABRIC[colorId] ?? '#777777';
  const spec = apparel[product.id];
  // La vista de detalle amplía la cara que lleva el gráfico.
  const baseView = view === 'back' || (view === 'detail' && spec && !spec.front?.length && spec.back?.length) ? 'back' : 'front';

  if (spec) {
    const scene = new Scene(fabric, { heather: colorId === 'gris' });
    if (product.silhouette === 'tee') tee(scene, baseView, spec);
    else if (product.silhouette === 'longsleeve') longsleeve(scene, baseView, spec);
    else if (product.silhouette === 'hoodie') hoodie(scene, baseView, spec);
    else if (product.silhouette === 'pants') pants(scene, baseView, spec, product.id === 'p-cargo-altura' ? 'cargo' : 'jogger');
    else if (product.silhouette === 'shorts') pants(scene, baseView, spec, 'shorts');
    return scene.toSVG(view === 'detail' ? viewBox(spec.detail) : undefined);
  }
  const { svg, detail } = accessory(product, colorId, view, fabric);
  return view === 'detail' && detail ? svg.replace(`viewBox="0 0 ${W} ${H}"`, `viewBox="${viewBox(detail)}"`) : svg;
}

const viewBox = ([x, y, w, h]: Box) => `${x} ${y} ${w} ${h}`;

export { INK_DARK, INK_LIGHT };
