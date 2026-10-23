/**
 * Qué lleva cada producto fotografiado y dónde: base de prenda por color y cara, zonas de
 * estampación medidas sobre cada foto y gráficos (marca oficial, técnica, tinta, tamaño, giro).
 *
 * Las decisiones de diseño son las del catálogo técnico anterior (qué marca va dónde, color de
 * tinta y técnica); aquí solo se miden las posiciones sobre la fotografía.
 *
 * Coordenadas en píxeles de la base (960×1280). Las zonas marcadas «miniatura» se estimaron sobre
 * la vista previa de la base en Figma y hay que revisarlas cuando la base esté en `bases/`.
 *
 * Bases: fotos de prenda lisa generadas con IA en el archivo de Figma `hayx2oxepmMhVgQEMGA7Pa`
 * (un frame de 960×1280 por base). Se exportan como PNG y se guardan en `bases/` como WebP (q≈92)
 * con el nombre `<tipo>-<color>-<cara>.webp`. Nodos:
 *   10:2 tee-negro-front · 14:2 tee-negro-back · 15:2 tee-blanco-front · 16:2 tee-blanco-back
 *   17:2 tee-grafito-front · 18:2 tee-grafito-back · 11:2 hoodie-negro-front · 19:2 hoodie-negro-back
 *   26:2 hoodie-gris-front · 27:2 hoodie-gris-back · 30:2 hoodie-grafito-back · 32:2 hoodie-blanco-back
 *   28:2 hoodiecord-negro-front · 29:2 hoodiecord-grafito-front · 31:2 hoodiecord-blanco-front
 *   Oversize / baggy (sustituyen a 20:2–25:2 y 33:2–42:2):
 *   55:2 ls-negro-front · 56:2 ls-negro-back · 57:2 ls-blanco-front · 58:2 ls-blanco-back
 *   59:2 ls-gris-front · 60:2 ls-gris-back · 61:2 jogger-negro-front · 62:2 jogger-negro-back
 *   63:2 jogger-grafito-front · 64:2 jogger-grafito-back · 53:2 cargo-negro-front · 54:2 cargo-negro-back
 *   65:2 shorts-negro-front · 66:2 shorts-negro-back · 67:2 shorts-rojo-front · 68:2 shorts-rojo-back
 *   43:2 cap-negro-front · 44:2 cap-negro-back · 45:2 cap-blanco-front · 46:2 cap-blanco-back
 *   47:2 beanie-negro-front · 48:2 beanie-rojo-front · 49:2 tote-negro-front · 50:2 tote-blanco-front
 *   51:2 socks-negro-front · 52:2 socks-blanco-front
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from '../../shared/types';
import type { Mark } from './raster';
import type { Technique } from './photo';

export const BASES_DIR = join(import.meta.dirname, 'bases');

export type Side = 'front' | 'back';
/** Tipo de base fotográfica (prefijo del archivo `<tipo>-<color>-<cara>.webp`). */
export type Kind = 'tee' | 'ls' | 'hoodie' | 'hoodiecord' | 'jogger' | 'cargo' | 'shorts' | 'cap' | 'beanie' | 'tote' | 'socks';
export type ZoneName = 'chest' | 'leftChest' | 'back' | 'thigh' | 'pocket' | 'leg' | 'crown' | 'bag' | 'cuffA' | 'cuffB' | 'tab';

/** Zona de estampación: centro (o borde superior con `top`), ancho de referencia y forma del soporte. */
export interface Zone {
  x: number;
  y: number;
  /** Ancho de la pieza en esa zona (cuerpo, pernera, copa…); los tamaños son fracciones de él. */
  ref: number;
  /** `y` es el borde superior del gráfico (pecho y espalda) en lugar de su centro. */
  top?: boolean;
  /** Giro propio del soporte (calcetín inclinado, gorra en tres cuartos). */
  rotate?: number;
  /** Radio de la curvatura horizontal en fracciones de `ref` (pecho ≈ 1,2; copa de gorra ≈ 0,6). */
  curve?: number;
}

type Geometry = Partial<Record<ZoneName, Zone>>;

/** Zonas por base concreta o, si no hay medida propia, por tipo y cara. */
const GEOMETRY: Record<string, Geometry> = {
  // Camisetas: cuello a 265 (negra) / 318 (blanca); cuerpo de 215 a 748.
  'tee-front': { chest: { x: 480, y: 338, ref: 533, top: true, curve: 1.3 }, leftChest: { x: 602, y: 372, ref: 533, curve: 1.3 } },
  'tee-blanco-front': { chest: { x: 474, y: 392, ref: 528, top: true, curve: 1.3 }, leftChest: { x: 596, y: 428, ref: 528, curve: 1.3 } },
  'tee-back': { back: { x: 480, y: 312, ref: 540, top: true, curve: 1.5 } },
  'tee-blanco-back': { back: { x: 490, y: 290, ref: 545, top: true, curve: 1.5 } },
  // Sudadera: capucha hasta 315 en el centro; bolsillo canguro desde 725.
  'hoodie-front': { chest: { x: 480, y: 432, ref: 600, top: true, curve: 1.3 }, leftChest: { x: 612, y: 440, ref: 600, curve: 1.3 } },
  'hoodie-back': { back: { x: 480, y: 452, ref: 590, top: true, curve: 1.5 } }, // miniatura
  // Espalda reconstruida desde el frente (photo.ts · synthHoodieBack): la capucha acaba en 398.
  'hoodie-synth-back': { back: { x: 480, y: 462, ref: 600, top: true, curve: 1.5 } },
  'hoodiecord-front': { chest: { x: 480, y: 440, ref: 600, top: true, curve: 1.3 }, leftChest: { x: 618, y: 450, ref: 600, curve: 1.3 } }, // miniatura
  'ls-front': { chest: { x: 480, y: 300, ref: 575, top: true, curve: 1.3 }, leftChest: { x: 608, y: 330, ref: 575, curve: 1.3 } }, // miniatura
  'ls-back': { back: { x: 480, y: 280, ref: 580, top: true, curve: 1.5 } }, // miniatura
  // Pantalones baggy (bases 53:2–68:2): perneras anchas de ~300 px.
  'jogger-front': { thigh: { x: 610, y: 340, ref: 300 } }, // miniatura
  // Cargo baggy (53:2): bolsillo lateral izquierdo de 233 a 310 px, tapeta hasta 435.
  'cargo-negro-front': { pocket: { x: 271, y: 512, ref: 220 } },
  'cargo-front': { pocket: { x: 250, y: 470, ref: 220 } }, // miniatura
  'shorts-front': { leg: { x: 690, y: 890, ref: 380 } }, // miniatura
  'cap-front': { crown: { x: 445, y: 560, ref: 420, rotate: -4, curve: 0.55 } }, // miniatura
  'beanie-front': { tab: { x: 825, y: 645, ref: 700 } }, // miniatura
  'tote-front': { bag: { x: 484, y: 820, ref: 610 } }, // miniatura
  'socks-front': { cuffA: { x: 442, y: 232, ref: 210, rotate: 2 }, cuffB: { x: 692, y: 282, ref: 210, rotate: 4 } }, // miniatura
};

/** Zona medida para una base (archivo concreto o, en su defecto, tipo y cara). */
export function zoneFor(baseName: string, kind: Kind, side: Side, zone: ZoneName): Zone | undefined {
  return GEOMETRY[baseName]?.[zone] ?? GEOMETRY[`${kind}-${side}`]?.[zone];
}

// ─── Gráficos por producto ──────────────────────────────────────────────────

/** Tinta: hex, `auto` (clara sobre tela oscura, oscura sobre clara) o `tone` (tono sobre tono). */
export type Ink = string;

export interface PrintSpec {
  mark: Mark;
  zone: ZoneName;
  /** Ancho del gráfico como fracción del ancho de referencia de la zona. */
  size: number;
  technique: Technique;
  ink?: Ink;
  rotate?: number;
  /** Color del parche en la etiqueta tejida. */
  patch?: string;
}

export interface Plan {
  kind: Kind;
  /** Base del frente si es de otro tipo (sudadera con cordones). */
  frontKind?: Kind;
  front?: PrintSpec[];
  back?: PrintSpec[];
  /** Cara y zona que amplía la vista de detalle (por defecto, la de los gráficos). */
  detail: Side;
  detailZone?: ZoneName;
  /** No hay foto de espalda: se usa el frente reflejado y sin estampar (gorro, bolsa, calcetines). */
  backFromFront?: boolean;
}

const RED_INK = '#b8142c';
const WOVEN_PATCH = '#202020';

export const PLANS: Record<string, Plan> = {
  'p-tee-ascenso': { kind: 'tee', front: [{ mark: 'monogram', zone: 'chest', size: 0.26, technique: 'screen' }], detail: 'front' },
  'p-tee-signal': {
    kind: 'tee',
    front: [{ mark: 'star', zone: 'leftChest', size: 0.19, technique: 'screen', ink: RED_INK, rotate: -6 }],
    back: [{ mark: 'star', zone: 'back', size: 0.58, technique: 'screen', ink: RED_INK, rotate: -6 }],
    detail: 'back',
  },
  'p-tee-mascot': { kind: 'tee', front: [{ mark: 'mascot', zone: 'chest', size: 0.36, technique: 'screen' }], detail: 'front' },
  'p-ls-base': { kind: 'ls', front: [{ mark: 'monogram', zone: 'leftChest', size: 0.085, technique: 'embroidery', ink: 'tone' }], detail: 'front' },
  'p-hoodie-ascenso': { kind: 'hoodie', front: [{ mark: 'wordmark', zone: 'chest', size: 0.3, technique: 'embroidery' }], detail: 'front' },
  'p-hoodie-monogram': { kind: 'hoodie', back: [{ mark: 'monogram', zone: 'back', size: 0.55, technique: 'screen' }], detail: 'back' },
  'p-hoodie-base': {
    kind: 'hoodie',
    frontKind: 'hoodiecord',
    front: [{ mark: 'monogram', zone: 'leftChest', size: 0.078, technique: 'embroidery' }],
    detail: 'front',
  },
  'p-jogger-tecnico': { kind: 'jogger', front: [{ mark: 'monogram', zone: 'thigh', size: 0.2, technique: 'embroidery' }], detail: 'front' },
  'p-cargo-altura': {
    kind: 'cargo',
    front: [{ mark: 'monogram', zone: 'pocket', size: 0.15, technique: 'woven', ink: RED_INK, patch: WOVEN_PATCH }],
    detail: 'front',
  },
  'p-short-training': { kind: 'shorts', front: [{ mark: 'monogram', zone: 'leg', size: 0.12, technique: 'screen' }], detail: 'front' },
  'p-cap-monogram': { kind: 'cap', front: [{ mark: 'monogram', zone: 'crown', size: 0.3, technique: 'puff' }], detail: 'front' },
  'p-beanie-signal': { kind: 'beanie', detail: 'front', detailZone: 'tab', backFromFront: true },
  'p-tote': { kind: 'tote', front: [{ mark: 'wordmark', zone: 'bag', size: 0.55, technique: 'screen' }], detail: 'front', backFromFront: true },
  'p-socks': {
    kind: 'socks',
    front: [
      { mark: 'monogram', zone: 'cuffA', size: 0.3, technique: 'knit' },
      { mark: 'monogram', zone: 'cuffB', size: 0.3, technique: 'knit' },
    ],
    detail: 'front',
    backFromFront: true,
  },
};

// ─── Bases ──────────────────────────────────────────────────────────────────

/** Tono fotográfico de cada color cuando hay que teñir una base negra. */
export const PHOTO_TONE: Record<string, string> = {
  grafito: '#3d3c3a',
  gris: '#8d8c89',
  blanco: '#e9e6df',
  rojo: '#b3142b',
};

export interface BaseSource {
  /** Nombre del archivo de base (sin extensión) que se usa de verdad. */
  name: string;
  kind: Kind;
  side: Side;
  mirror?: boolean;
  /** Teñir la base negra a este tono. */
  recolor?: string;
  /** La cara se reconstruye a partir de otra (ver photo.ts). */
  synth?: 'hoodie-back';
  /** Sin gráficos (espalda reflejada del frente). */
  blank?: boolean;
  /** Explicación para el registro cuando la base no es la propia. */
  note?: string;
}

const has = (name: string) => existsSync(join(BASES_DIR, `${name}.webp`));

/** Resuelve la base de una variante y cara: la propia, una equivalente o ninguna. */
export function resolveBase(product: Product, plan: Plan, colorId: string, side: Side): BaseSource | undefined {
  if (side === 'back' && plan.backFromFront) {
    const front = resolveBase(product, plan, colorId, 'front');
    return front && { ...front, side: 'back', mirror: !front.mirror, blank: true, note: [front.note, 'espalda = frente reflejado'].filter(Boolean).join('; ') };
  }
  const kinds: Kind[] = side === 'front' && plan.frontKind ? [plan.frontKind, plan.kind] : [plan.kind];
  for (const kind of kinds) {
    const fallbackKind = kind !== kinds[0] ? `sin base ${kinds[0]}, se usa ${kind}` : undefined;
    const own = `${kind}-${colorId}-${side}`;
    if (has(own)) return { name: own, kind, side, note: fallbackKind };
    const black = `${kind}-negro-${side}`;
    const tone = PHOTO_TONE[colorId];
    if (colorId !== 'negro' && tone && has(black)) {
      return { name: black, kind, side, recolor: tone, note: [fallbackKind, `teñida desde ${black}`].filter(Boolean).join('; ') };
    }
    if (kind === 'hoodie' && side === 'back' && has('hoodie-negro-front')) {
      return {
        name: 'hoodie-negro-front',
        kind,
        side,
        synth: 'hoodie-back',
        recolor: colorId === 'negro' ? undefined : tone,
        note: 'espalda reconstruida desde hoodie-negro-front' + (colorId === 'negro' ? '' : ` y teñida`),
      };
    }
  }
  // Sin foto de espalda: el frente reflejado y sin gráficos (mejor que mezclar foto y dibujo).
  if (side === 'back') {
    const front = resolveBase(product, plan, colorId, 'front');
    if (front) return { ...front, side: 'back', mirror: !front.mirror, blank: true, note: [front.note, 'sin base de espalda: frente reflejado'].filter(Boolean).join('; ') };
  }
  return undefined;
}
