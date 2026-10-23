/**
 * TEXTOS DE CAMPAÑA EDITABLES.
 * Todo el copy de la portada y de la barra de avisos está aquí para cambiarlo sin tocar componentes.
 * Fuente: Manual de Marca HYPSOS (eslogan, frases secundarias, manifiesto y biografía).
 * Regla: no incluir promesas comerciales (descuentos, envío gratis, fechas de lanzamiento,
 * plazos) que no estén confirmadas en shared/config.ts.
 */
import { campaignPhotos, heroMedia, heroPhoto } from '@shared/campaign';
import { paths } from '@shared/routes';

/** Banda superior en movimiento: frases del Manual (se repiten en bucle). */
export const announcements: string[] = ['Built for the climb.', 'Chapter 01 / Ascent', 'Reach higher.', 'Keep climbing.'];

/** Cintas cruzadas bajo el hero: frases del Manual en cuatro voces tipográficas. */
export const tapes = {
  label: 'Built for the climb. Chapter 01 / Ascent. Reach higher. Keep climbing. Above ordinary.',
  top: [
    { text: 'Built for the climb', style: 'wide' },
    { text: 'Chapter 01', style: 'gothic' },
    { text: 'Reach higher', style: 'crushed' },
    { text: '01', style: 'stencil' },
  ],
  bottom: [
    { text: 'Keep climbing', style: 'crushed' },
    { text: 'Ascent', style: 'gothic' },
    { text: 'Above ordinary', style: 'wide' },
    { text: 'HYP / 01', style: 'stencil' },
  ],
} as const;

/** Aviso fijo mientras el catálogo sea de demostración (store.demoCatalog). */
export const demoNotice = {
  long: 'Catálogo de demostración: productos, precios y stock no son reales',
  short: 'Demo · datos no reales',
};

/** Aviso sobre las imágenes de campaña provisionales. */
export const generatedImageNotice = 'Imágenes de campaña generadas con IA · provisionales';

export const hero = {
  chapter: 'Chapter 01 / Ascent',
  title: 'Built for the climb.',
  /** El titular se compone en dos anchos: comprimida arriba, ancha abajo. Juntas = `title`. */
  titleLines: ['Built for', 'the climb.'] as const,
  /** Pintada decorativa sobre el titular (nombre del capítulo, Manual). */
  tag: 'Ascent',
  /** Nota a mano junto a las acciones (frase secundaria del Manual). */
  note: 'keep climbing',
  lead: 'Streetwear independiente con un punto premium, gráficos con intención y drops limitados guiados por historias.',
  primaryCta: { label: 'Comprar Chapter 01', to: paths.collection('drop-01-ascenso') },
  secondaryCta: { label: 'Ver el editorial', to: '#editorial' },
  /** Foto o vídeo oficial de campaña; mientras no exista, la foto provisional (shared/campaign.ts). */
  media: heroMedia,
  photo: heroPhoto,
};

export const editorial = {
  kicker: 'Lookbook · Chapter 01',
  title: 'Above ordinary.',
  text: 'Siluetas amplias, algodón con peso y una trabilla roja siempre en el mismo sitio. Así se lleva el primer capítulo.',
};

export const signature = {
  kicker: 'El detalle firma',
  title: 'Una señal roja.',
  titleLines: ['Una señal', 'roja.'] as const,
  text: 'La firma de HYPSOS: una pequeña trabilla tejida en HYPSOS Red, colocada siempre en el mismo lugar. Sutil de cerca, reconocible a distancia.',
  photo: campaignPhotos.detail,
};

export const limited = {
  kicker: 'Cápsula Signal · Ediciones cortas',
  title: 'Reach higher.',
  titleLines: ['Reach', 'higher.'] as const,
  /** Pintada sobre la banda: nombre de la cápsula. */
  tag: 'Signal',
  text: 'La estrella HYPSOS, en gráficos de tirada corta.',
  cta: { label: 'Ver Signal', to: paths.collection('signal') },
  photo: campaignPhotos.rooftop,
};

export const manifesto = {
  title: 'Manifiesto',
  movement: 'The Ascent',
  statement: 'Siempre hay otro nivel. HYPSOS existe para las personas que siguen avanzando, aprendiendo, creando y construyendo.',
  accent: 'No estamos aquí para parecer terminados. Estamos aquí para seguir subiendo.',
  /** Pintada sobre el muro de la foto (frase secundaria del Manual). */
  tag: 'keep climbing',
  photo: campaignPhotos.spray,
};

/** The Climb System (Manual, sección 04): los códigos que hacen reconocible a HYPSOS. */
export const climbSystem = [
  { code: '01', title: 'Capítulos', text: 'Cada drop es un capítulo: Chapter 01 / Ascent.' },
  { code: '02', title: 'Niveles', text: 'Cada pieza lleva su código, como HYP-TS-001.' },
  { code: '03', title: 'Marca roja', text: 'Una trabilla en HYPSOS Red, siempre en el mismo sitio.' },
  { code: '04', title: 'Frase oculta', text: 'Una frase corta en el interior: Keep climbing.' },
];
