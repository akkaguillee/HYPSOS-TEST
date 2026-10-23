import type { MediaView } from './types';

/**
 * Imágenes de campaña (Chapter 01 / Ascent).
 *
 * IMPORTANTE: son imágenes GENERADAS CON IA (Figma AI, modelo gpt-image) como material provisional
 * hasta la sesión de fotos real. Las prendas que aparecen son lisas (sin los gráficos de HYPSOS)
 * y no representan a ningún producto concreto del catálogo. Se sustituyen dejando el mismo nombre
 * de archivo en public/assets/campaign/ o cambiando `src` aquí.
 */
export interface CampaignPhoto {
  /** Ruta base sin sufijo: se sirven `<base>-<ancho>.avif|webp`. */
  base: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  /** Imagen generada con IA (provisional). */
  generated: true;
}

const photo = (name: string, width: number, height: number, alt: string): CampaignPhoto => ({
  base: `/assets/campaign/${name}`,
  widths: [640, 960, width].filter((w, i, all) => w <= width && all.indexOf(w) === i),
  width,
  height,
  alt,
  generated: true,
});

export const campaignPhotos = {
  underpass: photo('underpass-crew', 1536, 864, 'Tres modelos con sudadera, camiseta y cargo negros oversize en un paso subterráneo lleno de graffiti'),
  spray: photo('spray-wall', 960, 1280, 'Modelo de espaldas con sudadera y cargo negros pintando con espray rojo un muro de hormigón al atardecer'),
  stairs: photo('chapter01-stairs', 1536, 864, 'Dos modelos con sudadera negra oversize y cargo ancho en una escalera de hormigón'),
  crew: photo('crew-sunset', 1536, 864, 'Tres modelos vestidos de negro en una azotea al atardecer'),
  rooftop: photo('summit-rooftop', 960, 1280, 'Modelo de espaldas con capucha negra mirando la ciudad de noche desde una azotea'),
  lookTee: photo('look-tee-cargo', 960, 1280, 'Modelo con camiseta negra oversize y pantalón cargo ancho en estudio'),
  lookHoodie: photo('look-hoodie-sweatpant', 960, 1280, 'Modelo con sudadera negra con capucha y jogger gris en estudio'),
  cap: photo('portrait-cap', 960, 1280, 'Retrato con gorra negra y camiseta oversize frente a un muro de hormigón'),
  cargo: photo('cargo-stairs', 960, 1280, 'Pantalón cargo negro ancho subiendo una escalera de hormigón'),
  detail: photo('detail-collar-tab', 1024, 1024, 'Detalle del cuello canalé de una camiseta negra con la trabilla roja en la costura'),
  accessories: photo('accessories-flatlay', 1024, 1024, 'Bolsa, calcetines, gorro, llavero y stickers negros sobre papel blanco roto'),
} satisfies Record<string, CampaignPhoto>;

export type CampaignPhotoId = keyof typeof campaignPhotos;

/**
 * Marco de campaña de la portada (lo usan la interfaz y la precarga del HTML inicial).
 * `heroMedia`: fotografía o vídeo oficial. Mientras sea `null`, la portada usa `campaignPhotos.underpass`.
 */
export type HeroMedia = { type: 'image'; src: string; alt: string; width: number; height: number } | { type: 'video'; src: string; poster: string };

export const heroMedia: HeroMedia | null = null;

export const heroPhoto = campaignPhotos.underpass;

/** Prenda destacada de la campaña (se usa en tarjetas y menús). */
export const heroFeature: { handle: string; colorId: string; view: MediaView } = {
  handle: 'sudadera-capucha-ascenso',
  colorId: 'negro',
  view: 'front',
};

/** Atributo `sizes` de la foto a sangre de la portada. */
export const HERO_SIZES = '100vw';

/** srcset de una foto de campaña en el formato indicado. */
export function campaignSrcSet(photo: CampaignPhoto, format: 'avif' | 'webp'): string {
  return photo.widths.map((w) => `${photo.base}-${w}.${format} ${w}w`).join(', ');
}
