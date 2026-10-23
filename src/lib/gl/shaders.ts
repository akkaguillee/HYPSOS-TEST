/**
 * Shaders GLSL ES 1.00: valen igual en contextos WebGL2 y WebGL1.
 *
 * Espacios:
 * - `vUv`: caja de la imagen, origen arriba a la izquierda, `y` hacia abajo (como CSS y como las filas de
 *   la textura subida sin UNPACK_FLIP_Y), así que no hay volteo en ningún paso.
 * - `p`: "anchos de caja" (x ∈ [0,1], y ∈ [0, alto/ancho]): distancias isótropas para lupa, ondas y ruido.
 *
 * Color: las texturas son sRGB tal cual (RGBA8, sin linealizar) con alfa premultiplicado y se componen sobre
 * el fondo de estudio igual que el navegador compone la <img>; la salida es opaca (lienzo `alpha: false`).
 */

export const MAX_RIPPLES = 8;

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define RIPPLES ${MAX_RIPPLES}

varying vec2 vUv;

uniform sampler2D uTex0;      // delantera (o vista única)
uniform sampler2D uTex1;      // trasera
uniform vec4 uCover0;         // object-fit: cover → escala (xy) y desplazamiento (zw)
uniform vec4 uCover1;
uniform vec2 uTexSize0;       // tamaño en texels (muestreo bicúbico)
uniform vec2 uTexSize1;
uniform vec2 uSize;           // caja en px CSS
uniform vec3 uBg;             // fondo de estudio (sRGB 0–1)
uniform float uTime;
uniform float uOctaves;

uniform float uProgress;      // 0 delantera → 1 trasera
uniform float uPlain;         // 1: fundido simple (relevo tardío del CSS a mitad de fundido)
uniform vec2 uOrigin;         // uv donde nace la transición (entrada del cursor)
uniform float uReach;         // distancia máxima origen → esquina (anchos)

uniform vec2 uMouse;          // uv suavizado del puntero
uniform float uLens;          // intensidad de la lupa 0–1
uniform float uRadius;        // radio de la lupa (anchos)
uniform float uPress;         // aplastado al pulsar 0–1
uniform float uZoom;          // zoom de hover (≥ 1)
uniform float uSheen;         // brillo especular 0–1
uniform vec4 uRipples[RIPPLES]; // xy centro (uv), z edad (s), w amplitud

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
}

// Ruido de gradiente con interpolación quíntica (C2: sin aristas visibles).
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    if (float(i) >= uOctaves) break;
    value += amp * gnoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p; // gira ~37° y duplica la frecuencia
    amp *= 0.5;
  }
  return value;
}

// Muestra con object-fit: cover y compone sobre el fondo (alfa premultiplicado).
vec3 sampleCover(sampler2D tex, vec4 cover, vec2 uv) {
  vec4 c = texture2D(tex, clamp(uv, 0.0, 1.0) * cover.xy + cover.zw);
  return c.rgb + uBg * (1.0 - c.a);
}

// Catmull-Rom (9 lecturas bilineales): tan nítido como el escalado de alta calidad del navegador.
// Se usa en reposo; durante la transición basta el bilineal (el movimiento lo oculta).
vec4 textureBicubic(sampler2D tex, vec2 uv, vec2 size) {
  vec2 pos = uv * size;
  vec2 p1 = floor(pos - 0.5) + 0.5;
  vec2 f = pos - p1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (p1 - 1.0) / size;
  vec2 t3 = (p1 + 2.0) / size;
  vec2 t12 = (p1 + w2 / w12) / size;
  vec4 c = texture2D(tex, vec2(t0.x, t0.y)) * w0.x * w0.y
    + texture2D(tex, vec2(t12.x, t0.y)) * w12.x * w0.y
    + texture2D(tex, vec2(t3.x, t0.y)) * w3.x * w0.y
    + texture2D(tex, vec2(t0.x, t12.y)) * w0.x * w12.y
    + texture2D(tex, vec2(t12.x, t12.y)) * w12.x * w12.y
    + texture2D(tex, vec2(t3.x, t12.y)) * w3.x * w12.y
    + texture2D(tex, vec2(t0.x, t3.y)) * w0.x * w3.y
    + texture2D(tex, vec2(t12.x, t3.y)) * w12.x * w3.y
    + texture2D(tex, vec2(t3.x, t3.y)) * w3.x * w3.y;
  return clamp(c, 0.0, 1.0);
}

vec3 sampleCoverSharp(sampler2D tex, vec4 cover, vec2 size, vec2 uv) {
  vec4 c = textureBicubic(tex, clamp(uv, 0.0, 1.0) * cover.xy + cover.zw, size);
  return c.rgb + uBg * (1.0 - c.a);
}

// Desplazamiento en anchos → uv.
vec2 toUv(vec2 d, float aspect) {
  return vec2(d.x, d.y * aspect);
}

void main() {
  float aspect = uSize.x / uSize.y;
  vec2 uv = vUv;
  vec2 p = vec2(uv.x, uv.y / aspect);
  vec2 m = vec2(uMouse.x, uMouse.y / aspect);

  // Sin desplazamientos junto a los bordes: nada se estira contra el borde de la textura.
  vec2 edgeIn = smoothstep(vec2(0.0), vec2(0.07), uv) * smoothstep(vec2(1.0), vec2(0.93), uv);
  float edgeWin = edgeIn.x * edgeIn.y;

  // 1 · Lupa: muestrea más cerca del centro (aumento ~1,35× en el centro), caída C1 sin costura en el borde.
  vec2 toM = p - m;
  float d = length(toM) / uRadius;
  float fall = d < 1.0 ? (1.0 - d * d) * (1.0 - d * d) : 0.0;
  float k = uLens * 0.26 * (1.0 - 1.7 * uPress);
  vec2 q = p - toM * k * fall * (k < 0.0 ? edgeWin : 1.0);

  // 2 · Estela de tela: ondas amortiguadas que nacen donde el puntero pasó rápido. Además del
  //     desplazamiento, la pendiente de la onda da una luz/sombra suave, como un pliegue que pasa.
  vec2 wake = vec2(0.0);
  float fold = 0.0;
  for (int i = 0; i < RIPPLES; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    vec2 dv = p - vec2(r.x, r.y / aspect);
    float dist = length(dv) + 1e-4;
    float x = dist - r.z * 0.4;                 // frente a 0,4 anchos/s
    float envelope = exp(-x * x * 70.0) * exp(-r.z * 2.8) * smoothstep(0.0, 0.06, r.z) * r.w;
    wake += (dv / dist) * sin(x * 40.0) * envelope;
    fold += max(cos(x * 40.0), 0.0) * envelope;
  }
  q += wake * 0.013 * edgeWin;

  vec2 suv = (vec2(q.x, q.y * aspect) - 0.5) / uZoom + 0.5;

  vec3 col;
  if (uProgress <= 0.0005) {
    col = sampleCoverSharp(uTex0, uCover0, uTexSize0, suv);
  } else if (uProgress >= 0.9995) {
    col = sampleCoverSharp(uTex1, uCover1, uTexSize1, suv);
  } else if (uPlain > 0.5) {
    col = mix(sampleCoverSharp(uTex0, uCover0, uTexSize0, suv), sampleCoverSharp(uTex1, uCover1, uTexSize1, suv), uProgress);
  } else {
    // 3 · Transición líquida: campo radial desde la entrada del cursor, deformado por fbm con
    //     domain warping; umbral suave (color) y una banda más ancha que arrastra la imagen.
    float t = uTime * 0.16;
    // Ruido de baja frecuencia: un único frente ondulado y conexo (no islas que fragmentan la prenda).
    vec2 np = p * 1.6;
    vec2 warp = vec2(fbm(np + vec2(0.0, t)), fbm(np + vec2(5.2, 1.3) - t));
    float n = clamp(0.5 + 1.1 * fbm(np * 0.9 + warp * 1.5 + vec2(t * 0.6, 0.0)), 0.0, 1.0);

    vec2 fromO = p - vec2(uOrigin.x, uOrigin.y / aspect);
    float field = clamp(length(fromO) / uReach * 0.72 + n * 0.28, 0.0, 1.0);

    float ew = 0.065;
    float mask = smoothstep(field - ew, field + ew, uProgress * (1.0 + 2.0 * ew) - ew);
    float bw = 0.15;
    float sweep = smoothstep(field - bw, field + bw, uProgress * (1.0 + 2.0 * bw) - bw);

    // Flujo: hacia fuera desde el origen, girado por el ruido (remolinos, no un barrido recto).
    float ang = (warp.x - warp.y) * 2.0;
    vec2 dir = normalize(fromO + vec2(1e-4, 0.0));
    dir = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * dir;
    float amp = 0.03 * (0.6 + 0.8 * n) * edgeWin / uZoom;

    // Direcciones opuestas: la delantera se va empujada, la trasera llega desde dentro y se asienta.
    vec2 uvFront = suv - toUv(dir * amp * sweep, aspect);
    vec2 uvBack = suv + toUv(dir * amp * (1.0 - sweep), aspect);

    float edge = 4.0 * mask * (1.0 - mask);
    vec3 front;
    vec3 back;
    if (edge > 0.02) {
      // Separación cromática ≤ 1,5 px CSS, solo en el frente que avanza.
      vec2 ca = vec2(dir.x / uSize.x, dir.y / uSize.y) * 1.5 * edge;
      front = vec3(sampleCover(uTex0, uCover0, uvFront + ca).r, sampleCover(uTex0, uCover0, uvFront).g, sampleCover(uTex0, uCover0, uvFront - ca).b);
      back = vec3(sampleCover(uTex1, uCover1, uvBack + ca).r, sampleCover(uTex1, uCover1, uvBack).g, sampleCover(uTex1, uCover1, uvBack - ca).b);
    } else {
      front = sampleCover(uTex0, uCover0, uvFront);
      back = sampleCover(uTex1, uCover1, uvBack);
    }
    col = mix(front, back, mask);
    // Menisco: la banda que arrastra la imagen se ilumina por delante y se sombrea por detrás, como el
    // borde de una lámina de líquido (muy tenue: no debe ensuciar el producto).
    float bump = 4.0 * sweep * (1.0 - sweep);
    col *= 1.0 + bump * (0.5 - mask) * 0.09;
    col += edge * 0.03;
  }
  // Solo luz en la cresta, como un pliegue que la atrapa (una sombra en tejido oscuro parecería una mancha).
  col = clamp(col + fold * 0.04 * edgeWin, 0.0, 1.0);

  // 4 · Brillo especular que sigue al puntero (mezcla "screen" a baja opacidad).
  vec2 s = p - m;
  float sheen = exp(-dot(s, s) * 9.0) * uSheen;
  col = col + (1.0 - col) * sheen * 0.06;

  gl_FragColor = vec4(col, 1.0);
}
`;
