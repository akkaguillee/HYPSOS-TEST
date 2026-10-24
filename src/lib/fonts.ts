/**
 * Tipografía de acento (Aerosoldier). Solo se carga si el archivo con licencia está en
 * `src/assets/fonts/licensed/` (no se sube al repositorio: ver src/assets/fonts/README.md).
 * Sin archivo, no hay petición ni error y el acento cae en Bastaman.
 */
const files = import.meta.glob<string>('../assets/fonts/licensed/aerosoldier.woff2', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Todo el latín salvo las cifras (0-9): en la versión de prueba son una marca de agua y, aun con licencia, no se leen bien en un precio. */
export const ACCENT_UNICODE_RANGE = 'U+0020-002F, U+003A-024F, U+2000-206F, U+20AC';

export function loadAccentFont(): boolean {
  const url = Object.values(files)[0];
  if (!url || typeof FontFace === 'undefined' || typeof document === 'undefined') return false;
  const face = new FontFace('Aerosoldier', `url(${url}) format('woff2')`, {
    display: 'swap',
    weight: '100 900',
    unicodeRange: ACCENT_UNICODE_RANGE,
  });
  document.fonts.add(face);
  // Con la fuente lista, las piezas de acento cambian a su composición propia (ver Hero.module.css).
  face
    .load()
    .then(() => {
      document.documentElement.dataset.accentFont = 'ready';
    })
    .catch(() => undefined);
  return true;
}
