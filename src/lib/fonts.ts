/**
 * Tipografía de acento. Aerosoldier solo se carga si el archivo con licencia está en
 * `src/assets/fonts/licensed/` (no se sube al repositorio: ver src/assets/fonts/README.md).
 * Sin él, el acento usa Sedgwick Ave Display (OFL, en el bundle). En cuanto una de las dos está
 * lista, `<html data-accent-font="ready">` activa la composición de acento (tamaño, giro).
 */
const files = import.meta.glob<string>('../assets/fonts/licensed/aerosoldier.woff2', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Todo el latín salvo las cifras (0-9): en la versión de prueba son una marca de agua y, aun con licencia, no se leen bien en un precio. */
export const ACCENT_UNICODE_RANGE = 'U+0020-002F, U+003A-024F, U+2000-206F, U+20AC';

function markReady() {
  document.documentElement.dataset.accentFont = 'ready';
}

export function loadAccentFont(): boolean {
  if (typeof document === 'undefined') return false;
  const url = Object.values(files)[0];
  if (!url || typeof FontFace === 'undefined') {
    // Sin Aerosoldier: se pide el sustituto libre y se activa la composición cuando llega.
    document.fonts?.load('400 1em "Sedgwick Ave Display"').then((faces) => faces.length > 0 && markReady(), () => undefined);
    return false;
  }
  const face = new FontFace('Aerosoldier', `url(${url}) format('woff2')`, {
    display: 'swap',
    weight: '100 900',
    unicodeRange: ACCENT_UNICODE_RANGE,
  });
  document.fonts.add(face);
  // Con la fuente lista, las piezas de acento cambian a su composición propia (ver Hero.module.css).
  face.load().then(markReady, () => undefined);
  return true;
}
