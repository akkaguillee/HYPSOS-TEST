/**
 * Qué se dibuja para cada producto: tipo de pieza, gráficos por vista y zona de detalle.
 * Los gráficos son siempre las marcas oficiales, colocadas como se describen en la ficha.
 * Coordenadas en el espacio de diseño de apparel.ts (la escena se encuadra después).
 */
import type { MediaView, Product } from '../../shared/types';
import { hoodie, longsleeve, pants, tee, type ApparelSpec, type Box } from './apparel';
import { accessory } from './accessories';
import { FABRIC, INK_DARK, INK_LIGHT, Scene, shade } from './kit';

const RED_INK = '#c8102e';
const toneOnTone = (scene: Scene) => shade(scene.fabric, scene.dark ? 0.16 : -0.12);

const apparel: Record<string, ApparelSpec> = {
  'p-tee-ascenso': {
    front: [() => ({ mark: 'monogram', x: 334, y: 300, w: 132, technique: 'screen' })],
    detail: [256, 190, 288, 360],
  },
  'p-tee-signal': {
    front: [() => ({ mark: 'star', x: 448, y: 288, w: 96, technique: 'screen', color: RED_INK, rotate: -6 })],
    back: [() => ({ mark: 'star', x: 186, y: 300, w: 428, technique: 'screen', color: RED_INK, rotate: -6 })],
    detail: [392, 212, 200, 250],
  },
  'p-tee-mascot': {
    front: [() => ({ mark: 'mascot', x: 283, y: 290, w: 234, technique: 'screen' })],
    detail: [250, 220, 300, 375],
  },
  'p-ls-base': {
    front: [(s) => ({ mark: 'monogram', x: 454, y: 290, w: 48, technique: 'embroidery', color: toneOnTone(s) })],
    detail: [398, 232, 160, 200],
  },
  'p-hoodie-ascenso': {
    front: [() => ({ mark: 'wordmark', x: 314, y: 404, w: 172, technique: 'embroidery' })],
    detail: [270, 290, 260, 325],
  },
  'p-hoodie-monogram': {
    back: [() => ({ mark: 'monogram', x: 212, y: 392, w: 376, technique: 'screen' })],
    detail: [168, 320, 464, 580],
  },
  'p-hoodie-base': {
    front: [() => ({ mark: 'monogram', x: 452, y: 392, w: 46, technique: 'embroidery' })],
    detail: [356, 290, 200, 250],
    cords: true,
  },
  'p-jogger-tecnico': {
    front: [() => ({ mark: 'monogram', x: 470, y: 296, w: 42, technique: 'embroidery' })],
    detail: [420, 236, 160, 200],
  },
  'p-cargo-altura': {
    front: [() => ({ mark: 'monogram', x: 224, y: 398, w: 34, technique: 'woven', color: RED_INK })],
    detail: [156, 360, 176, 220],
  },
  'p-short-training': {
    front: [() => ({ mark: 'monogram', x: 516, y: 618, w: 44, technique: 'screen' })],
    detail: [460, 560, 160, 200],
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
    const bottoms = product.silhouette === 'pants' || product.silhouette === 'shorts';
    const scene = new Scene(fabric, bottoms ? 'bottoms' : 'tops');
    if (product.silhouette === 'tee') tee(scene, baseView, spec);
    else if (product.silhouette === 'longsleeve') longsleeve(scene, baseView, spec);
    else if (product.silhouette === 'hoodie') hoodie(scene, baseView, spec);
    else if (product.silhouette === 'pants') pants(scene, baseView, spec, product.id === 'p-cargo-altura' ? 'cargo' : 'jogger');
    else if (product.silhouette === 'shorts') pants(scene, baseView, spec, 'shorts');
    return scene.toSVG(view === 'detail' ? spec.detail : undefined);
  }
  const { scene, detail } = accessory(product, view === 'back' ? 'back' : 'front', fabric);
  return scene.toSVG(view === 'detail' ? detail : undefined);
}

export type { Box };
export { INK_DARK, INK_LIGHT };
