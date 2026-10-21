import type { SizeGuideType } from '@shared/types';

/**
 * Medidas de prenda en centímetros. VALORES PROVISIONALES: sustituir por las
 * medidas reales de producción antes de publicar.
 */
export const sizeGuides: Record<SizeGuideType, { title: string; columns: string[]; rows: [string, ...(string | number)[]][]; howTo: string[] }> = {
  tops: {
    title: 'Camisetas y sudaderas (corte oversize)',
    columns: ['Talla', 'Ancho de pecho', 'Largo total', 'Largo de manga'],
    rows: [
      ['XS', 54, 68, 22],
      ['S', 57, 70, 23],
      ['M', 60, 72, 24],
      ['L', 63, 74, 25],
      ['XL', 66, 76, 26],
      ['XXL', 69, 78, 27],
    ],
    howTo: [
      'Ancho de pecho: de costura a costura, 2 cm por debajo de la sisa, con la prenda plana.',
      'Largo total: desde el punto más alto del hombro hasta el bajo.',
      'Si estás entre dos tallas o prefieres un ajuste regular, elige la menor.',
    ],
  },
  bottoms: {
    title: 'Pantalones y shorts',
    columns: ['Talla', 'Cintura', 'Cadera', 'Largo exterior'],
    rows: [
      ['XS', '70–74', 92, 100],
      ['S', '74–78', 96, 102],
      ['M', '78–82', 100, 104],
      ['L', '82–86', 104, 106],
      ['XL', '86–92', 108, 108],
      ['XXL', '92–98', 112, 110],
    ],
    howTo: [
      'Cintura: mide alrededor de la parte más estrecha de tu cintura (rango con elástico relajado y estirado).',
      'Cadera: alrededor de la parte más ancha, con los pies juntos.',
      'Los shorts tienen un largo de pierna de 7" (18 cm).',
    ],
  },
};
