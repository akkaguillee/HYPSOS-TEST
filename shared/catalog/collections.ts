import type { Collection } from '../types';

/**
 * Colecciones editoriales. CONTENIDO DE EJEMPLO: nombres y textos provisionales
 * a validar por HYPSOS.
 */
export const collections: Collection[] = [
  {
    handle: 'drop-01-ascenso',
    name: 'Ascent',
    kicker: 'Chapter 01',
    tagline: 'Algodón pesado y el monograma H.',
    description:
      'La primera entrega de HYPSOS. Siluetas amplias, algodón pesado y el monograma H como punto de partida. Una colección pensada para quien sube un escalón cada día.',
    releasedAt: '2026-10-01',
    cover: { handle: 'sudadera-capucha-ascenso', colorId: 'negro', view: 'front' },
  },
  {
    handle: 'signal',
    name: 'Signal',
    kicker: 'Cápsula',
    tagline: 'Una señal en rojo.',
    description:
      'Gráficos de la estrella HYPSOS en ediciones cortas. Cuando se agotan, no vuelven.',
    releasedAt: '2026-09-12',
    cover: { handle: 'camiseta-signal-star', colorId: 'negro', view: 'back' },
  },
  {
    handle: 'base',
    name: 'Base',
    kicker: 'Esenciales',
    tagline: 'El uniforme de todos los días.',
    description:
      'Las piezas permanentes de la marca: colores sólidos, detalles mínimos y la calidad que sostiene todo lo demás.',
    releasedAt: '2026-06-01',
    cover: { handle: 'sudadera-capucha-base', colorId: 'negro', view: 'front' },
  },
];

export function getCollection(handle: string): Collection | undefined {
  return collections.find((collection) => collection.handle === handle);
}
