/**
 * TEXTOS DE CAMPAÑA EDITABLES.
 * Todo el copy de la portada y de la barra de avisos está aquí para cambiarlo sin tocar componentes.
 * Regla: no incluir promesas comerciales (descuentos, envío gratis, fechas de lanzamiento,
 * plazos) que no estén confirmadas en shared/config.ts.
 */
import { paths } from '@shared/routes';

export const announcements: string[] = ['HYPSOS — Por encima del ruido', 'Colección Ascenso', 'Streetwear · Training · Cultura urbana'];

/** Aviso fijo mientras el catálogo sea de demostración (store.demoCatalog). */
export const demoNotice = {
  long: 'Catálogo de demostración: productos, precios y stock no son reales',
  short: 'Demo · datos no reales',
};

export const hero = {
  eyebrow: 'Colección Ascenso',
  title: 'Por encima del ruido',
  lead: 'Siluetas amplias, tejidos con peso y gráficos con intención. Streetwear para entrenar, moverse y destacar.',
  primaryCta: { label: 'Descubrir la colección', to: paths.collection('drop-01-ascenso') },
  secondaryCta: { label: 'Toda la tienda', to: paths.collection('all') },
  /**
   * Medio de campaña opcional. Mientras no exista fotografía o vídeo oficial se usa el
   * monograma cromado. Ejemplos:
   *   { type: 'image', src: '/assets/campaign/hero.avif', alt: '…', width: 2400, height: 1600 }
   *   { type: 'video', src: '/assets/campaign/hero.mp4', poster: '/assets/campaign/hero.jpg' }
   */
  media: null as
    | null
    | { type: 'image'; src: string; alt: string; width: number; height: number }
    | { type: 'video'; src: string; poster: string },
};

export const ticker = ['Por encima del ruido', 'Streetwear', 'Movimiento', 'Training', 'Cultura urbana', 'Comunidad'];

export const manifesto = {
  title: 'Manifiesto',
  statement: 'Hecho para quien sube un escalón cada día. Ropa para entrenar, para la calle y para todo lo que pasa entre medias.',
  accent: 'Sin permiso. Sin ruido.',
  pillars: [
    { title: 'Identidad', text: 'Cada pieza lleva una idea detrás. Nada de logos por rellenar.' },
    { title: 'Movimiento', text: 'Patrones pensados para entrenar, caminar la ciudad y no parar.' },
    { title: 'Comunidad', text: 'HYPSOS es de quien lo lleva. Cada colección se construye con vosotros.' },
  ],
};
