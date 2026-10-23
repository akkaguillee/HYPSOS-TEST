/**
 * Descarga las fotos base que falten en `bases/` desde los enlaces de `sources.ts` y las guarda
 * como WebP (q92, 960×1280). Después: `pnpm mockups`.
 *
 *   pnpm mockups:bases            # solo las que faltan
 *   pnpm mockups:bases --force    # todas
 *
 * Necesita salida a www.figma.com. Los enlaces caducan a los 7 días de generarse.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { BASES_DIR } from './placements';
import { BASE_SOURCES } from './sources';

const force = process.argv.includes('--force');

/** curl respeta HTTPS_PROXY (el fetch de Node no siempre); si no hay curl, fetch. */
async function download(url: string): Promise<Buffer> {
  try {
    return execFileSync('curl', ['-fsSL', '--max-time', '60', url], { maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('descarga rechazada (¿www.figma.com permitido en la red?)');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
}
mkdirSync(BASES_DIR, { recursive: true });
let ok = 0;
const failed: string[] = [];

for (const [name, { node, url }] of Object.entries(BASE_SOURCES)) {
  const out = join(BASES_DIR, `${name}.webp`);
  if (!force && existsSync(out)) continue;
  try {
    const png = await download(url);
    const meta = await sharp(png).metadata();
    if (meta.width !== 960 || meta.height !== 1280) throw new Error(`tamaño inesperado ${meta.width}×${meta.height}`);
    await sharp(png).removeAlpha().webp({ quality: 92, effort: 6 }).toFile(out);
    ok++;
    console.log(`✓ ${name} (${node})`);
  } catch (error) {
    failed.push(`${name} (${node}): ${(error as Error).message}`);
  }
}
console.log(`\n${ok} bases descargadas.`);
if (failed.length) {
  console.log(`No se pudieron descargar ${failed.length}; expórtalas desde Figma (nodo indicado):\n  ${failed.join('\n  ')}`);
  process.exitCode = 1;
}
