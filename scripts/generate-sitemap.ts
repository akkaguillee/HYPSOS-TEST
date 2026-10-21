/**
 * Genera dist/sitemap.xml y dist/robots.txt con la URL pública (PUBLIC_URL).
 * Se ejecuta al final de `pnpm build`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { categories, collections, products } from '../shared/catalog';
import { contentPages, paths, specialCollections } from '../shared/routes';

const root = resolve(import.meta.dirname, '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
// Netlify expone la URL del sitio en URL; PUBLIC_URL tiene prioridad si se define.
const base = (process.env.PUBLIC_URL ?? process.env.URL ?? 'http://localhost:5173').replace(/\/$/, '');
const dist = resolve(root, 'dist');

const legal = new Set(['privacidad', 'terminos', 'cookies', 'aviso-legal']);
const urls: { path: string; priority: number }[] = [
  { path: paths.home, priority: 1 },
  ...[specialCollections.all, specialCollections.novedades, specialCollections.colecciones].map((c) => ({ path: paths.collection(c.handle), priority: 0.8 })),
  ...categories.map((c) => ({ path: paths.collection(c.handle), priority: 0.8 })),
  ...collections.map((c) => ({ path: paths.collection(c.handle), priority: 0.7 })),
  ...products.map((p) => ({ path: paths.product(p.handle), priority: 0.9 })),
  ...Object.keys(contentPages).map((handle) => ({
    path: paths.page(handle as keyof typeof contentPages),
    priority: legal.has(handle) ? 0.2 : 0.5,
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${base}${url.path === '/' ? '/' : url.path}</loc><priority>${url.priority.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(resolve(dist, 'sitemap.xml'), xml);

const robots = readFileSync(resolve(root, 'public/robots.txt'), 'utf8').replace(/^Sitemap: .*$/m, `Sitemap: ${base}/sitemap.xml`);
writeFileSync(resolve(dist, 'robots.txt'), robots);
console.log(`sitemap.xml: ${urls.length} URLs (${base})`);
