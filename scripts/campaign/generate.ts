/**
 * Genera las fotos de campaña (no los mockups de producto) con la API de Gemini de Google.
 *
 * Clave: la variable `GEMINI_API_KEY` del entorno o un secreto de red que el proxy añada a las
 * peticiones a generativelanguage.googleapis.com. La clave nunca se imprime ni se guarda.
 *
 *   pnpm campaign:generate --list                  # modelos de imagen disponibles con la clave
 *   pnpm campaign:generate --dry                   # muestra qué se generaría, sin llamar a la API
 *   pnpm campaign:generate                         # todas las tomas, 2 candidatas por toma
 *   pnpm campaign:generate --only chapter01-stairs --count 4
 *   GEMINI_IMAGE_MODEL=imagen-4.0-ultra-generate-001 pnpm campaign:generate
 *
 * Las candidatas se guardan en `scripts/campaign/generated/<toma>-<n>.png` (fuera del
 * repositorio). La elegida se copia a `scripts/campaign/originals/<toma>.webp` con
 * `--pick <toma>=<n>` y después `pnpm campaign:film` la revela y la publica.
 * Cada imagen generada se cobra en la cuenta de Google de la clave.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const OUT = resolve('scripts/campaign/generated');
const ORIGINALS = resolve('scripts/campaign/originals');

type Aspect = '16:9' | '3:4' | '1:1';

interface Shot {
  /** Nombre del archivo final (el mismo que usa shared/campaign.ts). */
  name: string;
  aspect: Aspect;
  /** Ancho mínimo aceptable de la imagen final. */
  minWidth: number;
  prompt: string;
}

/** Reglas comunes del brief (docs/brief-fotografia.md): realismo, luz dura, sin graffiti. */
const LOOK =
  'Shot on a 35mm film camera, natural skin texture with visible pores, no retouching, fine film grain, deep true blacks, ' +
  'muted realistic colours, editorial fashion campaign. Clothing is blank: no logos, no text, no prints, no graffiti, no watermark.';

const SHOTS: Shot[] = [
  {
    name: 'chapter01-stairs',
    aspect: '16:9',
    minWidth: 1536,
    prompt:
      'Two young models, a man and a woman, standing on brutalist raw concrete stairs, low camera angle. Both wear black heavyweight ' +
      'oversized hoodies with dropped shoulders and very wide black cargo pants; a tiny red woven label tab at the hoodie hem. The two ' +
      'figures stand on the right third of the frame; the left half is an empty concrete wall. One hard side light from the left, long ' +
      'shadows, the shadow side falls to black. They look away from the camera, calm and confident. ' + LOOK,
  },
  {
    name: 'crew-sunset',
    aspect: '16:9',
    minWidth: 1536,
    prompt:
      'Three young models on an industrial rooftop at dusk, city skyline far behind, low sun just below the horizon. All wear black ' +
      'oversized hoodies or tees and wide black cargo pants with chunky black sneakers. Low camera angle, figures on the left half, sky ' +
      'gradient from deep blue to warm orange, rim light on the shoulders. Nobody looks at the camera. ' + LOOK,
  },
  {
    name: 'summit-rooftop',
    aspect: '3:4',
    minWidth: 960,
    prompt:
      'A single model seen from behind with the hood up, standing on the edge of a concrete rooftop at night, looking over a dense city ' +
      'of lights. Black oversized hoodie and wide black cargo pants. A red light from a sign spills on one side of the body, the other ' +
      'side is in deep shadow. Subtle wind in the fabric. ' + LOOK,
  },
  {
    name: 'look-tee-cargo',
    aspect: '3:4',
    minWidth: 960,
    prompt:
      'Full body studio fashion photograph of a young male model on a seamless warm light-grey background, standing relaxed with hands ' +
      'in pockets, three-quarter pose, looking off-camera. Black heavyweight boxy oversized t-shirt with dropped shoulders and very wide ' +
      'black cargo pants with side pockets, black sneakers. One soft directional key light from the left, gentle floor shadow. ' + LOOK,
  },
  {
    name: 'portrait-cap',
    aspect: '3:4',
    minWidth: 960,
    prompt:
      'Close portrait of a young woman wearing a plain black baseball cap and a black oversized t-shirt, leaning against a raw concrete ' +
      'wall, hard afternoon sunlight cutting a diagonal shadow across the wall, she looks slightly away from the camera, a small red ' +
      'woven label tab on the side of the cap. ' + LOOK,
  },
  {
    name: 'cargo-stairs',
    aspect: '3:4',
    minWidth: 960,
    prompt:
      'Low angle photograph from behind of a person walking up raw concrete stairs, framed from the waist down: very wide black cargo ' +
      'pants with side pockets stacking over chunky black sneakers, fabric in motion, hard side sunlight and long shadows on the steps. ' +
      LOOK,
  },
  {
    name: 'detail-collar-tab',
    aspect: '1:1',
    minWidth: 1024,
    prompt:
      'Macro product detail photograph of a folded black heavyweight cotton t-shirt: thick ribbed crew neck collar and, at the side seam, ' +
      'one small red woven label tab without text. Soft directional studio light grazing the fabric so the cotton texture is visible, ' +
      'white surface. ' + LOOK,
  },
];

const PREFERRED = ['imagen-4.0-ultra-generate-001', 'imagen-4.0-generate-001', 'gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function headers(): Record<string, string> {
  const key = process.env.GEMINI_API_KEY;
  return { 'content-type': 'application/json', ...(key ? { 'x-goog-api-key': key } : {}) };
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}/${path}`, { method: body ? 'POST' : 'GET', headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
    } catch {
      // Respuesta no JSON: se muestra tal cual.
    }
    if ((response.status === 401 || response.status === 403) && !process.env.GEMINI_API_KEY) {
      throw new Error('Falta la clave de Gemini: añade GEMINI_API_KEY en el entorno (o como secreto de red) y abre una sesión nueva.');
    }
    throw new Error(`API ${response.status}: ${message}`);
  }
  return JSON.parse(text) as T;
}

interface ModelInfo {
  name: string;
  supportedGenerationMethods?: string[];
}

async function listImageModels(): Promise<string[]> {
  const models: string[] = [];
  let pageToken = '';
  do {
    const page = await call<{ models?: ModelInfo[]; nextPageToken?: string }>(`models?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`);
    for (const model of page.models ?? []) {
      const id = model.name.replace(/^models\//, '');
      if (/imagen|image/.test(id)) models.push(id);
    }
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return models;
}

/** Imagen (`:predict`): varias imágenes por llamada. */
async function generateImagen(model: string, shot: Shot, count: number): Promise<Buffer[]> {
  const parameters: Record<string, unknown> = { sampleCount: count, aspectRatio: shot.aspect, personGeneration: 'allow_adult' };
  if (!model.includes('fast')) parameters.sampleImageSize = '2K';
  const body = { instances: [{ prompt: shot.prompt }], parameters };
  let result: { predictions?: { bytesBase64Encoded?: string }[] };
  try {
    result = await call(`models/${model}:predict`, body);
  } catch (error) {
    // Algunos modelos no aceptan el tamaño 2K: se reintenta con el tamaño por defecto.
    if (!parameters.sampleImageSize) throw error;
    delete parameters.sampleImageSize;
    result = await call(`models/${model}:predict`, body);
  }
  return (result.predictions ?? []).flatMap((p) => (p.bytesBase64Encoded ? [Buffer.from(p.bytesBase64Encoded, 'base64')] : []));
}

/** Gemini (`:generateContent`): una imagen por llamada. */
async function generateGemini(model: string, shot: Shot, count: number): Promise<Buffer[]> {
  const images: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const result = await call<{ candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] }>(`models/${model}:generateContent`, {
      contents: [{ parts: [{ text: shot.prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: shot.aspect } },
    });
    for (const part of result.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) images.push(Buffer.from(part.inlineData.data, 'base64'));
    }
  }
  return images;
}

async function main() {
  const only = option('only')?.split(',');
  const count = Math.max(1, Math.min(4, Number(option('count') ?? 2)));
  const shots = SHOTS.filter((shot) => !only || only.includes(shot.name));

  const pick = option('pick');
  if (pick) {
    const [name, n] = pick.split('=');
    const source = join(OUT, `${name}-${n}.png`);
    if (!existsSync(source)) throw new Error(`No existe ${source}`);
    await sharp(source).webp({ quality: 95 }).toFile(join(ORIGINALS, `${name}.webp`));
    console.log(`✓ ${name}: candidata ${n} copiada a originals/. Ahora: pnpm campaign:film --only ${name}`);
    return;
  }

  if (process.argv.includes('--dry')) {
    for (const shot of shots) console.log(`${shot.name} (${shot.aspect}, ${count} candidatas)\n  ${shot.prompt}\n`);
    console.log(`Total: ${shots.length * count} imágenes.`);
    return;
  }

  const available = await listImageModels();
  if (process.argv.includes('--list')) {
    console.log(available.join('\n') || 'La clave no da acceso a ningún modelo de imagen.');
    return;
  }
  const model = process.env.GEMINI_IMAGE_MODEL ?? PREFERRED.find((id) => available.includes(id)) ?? available[0];
  if (!model) throw new Error('La clave no da acceso a ningún modelo de imagen de Gemini.');
  console.log(`Modelo: ${model}`);

  mkdirSync(OUT, { recursive: true });
  for (const shot of shots) {
    const images = model.startsWith('imagen') ? await generateImagen(model, shot, count) : await generateGemini(model, shot, count);
    if (images.length === 0) {
      console.log(`✗ ${shot.name}: la API no devolvió imágenes (posible filtro de seguridad).`);
      continue;
    }
    for (const [index, image] of images.entries()) {
      const file = join(OUT, `${shot.name}-${index + 1}.png`);
      writeFileSync(file, image);
      const { width = 0, height = 0 } = await sharp(image).metadata();
      const small = width < shot.minWidth ? ` (más pequeña de lo necesario: mínimo ${shot.minWidth} px de ancho)` : '';
      console.log(`✓ ${shot.name}-${index + 1}.png ${width}×${height}${small}`);
    }
  }
  console.log(`\nCandidatas en ${OUT}. Elige una por toma con --pick <toma>=<n>.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
