/**
 * Versión estática de la web para alojamientos sin servidor Node (Netlify, Vercel estático…).
 * Copia `dist/` a `dist-static/` y añade:
 *   - una página HTML por ruta conocida con su título, descripción, canonical, Open Graph,
 *     JSON-LD y precarga de imagen (lo mismo que inyecta el servidor Node en cada petición);
 *   - `404.html` para rutas inexistentes (404 real con las reglas de netlify.toml);
 *   - `api-unavailable.json`: respuesta de /api/* cuando no hay API, para que la web lo indique
 *     con claridad en lugar de fallar;
 *   - `_redirects` y `_headers` con las reglas de Netlify (válidas también al subir la carpeta a mano).
 * Define PUBLIC_URL (o en .env) para que canonical, Open Graph y sitemap usen el dominio real.
 * Sin la API no hay stock en vivo, pedidos, cuentas ni formularios: la web lo dice en cada pantalla.
 *
 *   pnpm build:static   (lo usa netlify.toml)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderHtml } from '../server/html';
import { knownRoutes } from '../shared/routes';

const root = resolve(import.meta.dirname, '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const dist = resolve(root, 'dist');
const out = resolve(root, 'dist-static');
if (!existsSync(resolve(dist, 'index.html'))) throw new Error('Falta dist/index.html: ejecuta antes `vite build`.');
// Netlify expone la URL del sitio en URL; PUBLIC_URL tiene prioridad si se define.
const publicUrl = (process.env.PUBLIC_URL ?? process.env.URL ?? 'http://localhost:5173').replace(/\/$/, '');

rmSync(out, { recursive: true, force: true });
cpSync(dist, out, { recursive: true });
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');

let pages = 0;
// /ruta → ruta.html: Netlify sirve /ruta desde ruta.html sin redirigir a /ruta/ (con ruta/index.html sí lo haría).
for (const route of knownRoutes()) {
  const file = route === '/' ? resolve(out, 'index.html') : resolve(out, `.${route}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderHtml(template, route, publicUrl));
  pages += 1;
}
writeFileSync(resolve(out, '404.html'), renderHtml(template, '/404', publicUrl));
writeFileSync(
  resolve(out, 'api-unavailable.json'),
  JSON.stringify({
    error: 'backend_unavailable',
    message: 'Esta función necesita el servidor de la tienda, que no está activo en esta versión de la web. Puedes seguir navegando por el catálogo.',
  }),
);
// Reglas en el propio directorio publicado: Netlify las aplica también en subidas manuales (Netlify Drop).
writeFileSync(
  resolve(out, '_redirects'),
  ['# Sin API en este alojamiento: JSON explícito.', '/api/*  /api-unavailable.json  404!', '# Rutas conocidas prerenderizadas; el resto, 404 real.', '/*  /404.html  404', ''].join('\n'),
);
writeFileSync(
  resolve(out, '_headers'),
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    "  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    '',
  ].join('\n'),
);
console.log(`dist-static: ${pages} páginas prerenderizadas + 404.html (${publicUrl})`);
