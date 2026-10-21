#!/usr/bin/env node
/**
 * Sirve dist-static/ con las mismas reglas que netlify.toml (para probar el despliegue estático):
 * archivos y páginas prerenderizadas (/ruta → ruta.html) → 200; /api/* → api-unavailable.json con 404;
 * resto → 404.html con 404.
 *
 *   node scripts/serve-static.mjs [puerto=4174]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist-static');
const port = Number(process.argv[2] ?? 4174);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

async function file(path) {
  try {
    const info = await stat(path);
    if (info.isDirectory()) return null;
    return { body: await readFile(path), type: types[extname(path)] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const target = normalize(join(root, decodeURIComponent(pathname)));
  if (!target.startsWith(root)) {
    res.writeHead(400).end();
    return;
  }
  const found = pathname.startsWith('/api/') ? null : pathname === '/' ? await file(join(root, 'index.html')) : ((await file(target)) ?? (await file(`${target}.html`)));
  const fallback = pathname.startsWith('/api/') ? join(root, 'api-unavailable.json') : join(root, '404.html');
  const result = found ?? (await file(fallback));
  res.writeHead(found ? 200 : 404, { 'content-type': result?.type ?? 'text/plain' });
  res.end(result?.body ?? 'Not found');
}).listen(port, () => console.log(`dist-static en http://localhost:${port}`));
