import { metaForPath } from '../shared/seo';
import type { StockLookup } from '../shared/types';

const META_BLOCK = /<!--meta:start-->[\s\S]*?<!--meta:end-->/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON seguro dentro de <script>: evita cerrar la etiqueta desde los datos. */
function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Sustituye el bloque de metadatos de index.html por los de la ruta solicitada,
 * para que buscadores y redes sociales vean título, descripción e imagen correctos
 * sin necesidad de ejecutar JavaScript.
 */
export function renderHtml(template: string, pathname: string, publicUrl: string, stock?: StockLookup, search = ''): string {
  const meta = metaForPath(pathname, publicUrl, stock, search);
  const url = `${publicUrl}${pathname === '/' ? '' : pathname}`;
  const image = `${publicUrl}${meta.image}`;
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${meta.type === 'product' ? 'product' : 'website'}" />`,
    `<meta property="og:site_name" content="HYPSOS" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    meta.noindex ? `<meta name="robots" content="noindex" />` : '',
    meta.preloadImage
      ? `<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage.href)}"${
          meta.preloadImage.srcset ? ` imagesrcset="${escapeHtml(meta.preloadImage.srcset)}" imagesizes="${escapeHtml(meta.preloadImage.sizes)}"` : ''
        } fetchpriority="high" />`
      : '',
    ...(meta.jsonLd ?? []).map((data) => `<script type="application/ld+json">${escapeJsonForScript(data)}</script>`),
  ].filter(Boolean);
  return template.replace(META_BLOCK, `<!--meta:start-->\n    ${tags.join('\n    ')}\n    <!--meta:end-->`);
}
