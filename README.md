# HYPSOS — Web y tienda online

Web de marca y e-commerce de **HYPSOS**:

- **Experiencia:** motion graphics construidos con las marcas planas oficiales.
- **Catálogo:** filtros, paginación, búsqueda con teclado y fichas con zoom y variantes agotadas.
- **Compra:** carrito, checkout con Stripe Checkout, inventario real con reservas y cuentas de usuario.
- **Backend:** API propia con base de datos.

> **Estado:** funcional de extremo a extremo con un **catálogo de demostración** (productos, precios y stock no son reales, y se avisa en toda la web). Antes de vender hay que completar los [pendientes](#pendientes-antes-de-publicar).

---

## Puesta en marcha

Requisitos: **Node ≥ 22.13** (usa `node:sqlite`) y **pnpm 10** (`corepack enable`).

```bash
pnpm install
cp .env.example .env      # opcional en local: los valores por defecto funcionan
pnpm dev                  # web en http://localhost:5173 + API en :8787
```

Sin configuración, la tienda funciona salvo lo que depende de servicios externos, y lo dice claramente:

- **Sin tarifas de envío ni Stripe:** el checkout responde «Envíos aún no configurados» o «Pagos online aún no disponibles». No se crea ningún pedido ni se simula ningún cobro.
- **Sin proveedor de email:** en desarrollo los emails se escriben en la consola. En producción la recuperación de contraseña indica que no está disponible, en lugar de fingir que ha enviado el email.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Vite + API con recarga en caliente |
| `pnpm build` | Typecheck, build de la web, bundle de la API y `sitemap.xml` |
| `pnpm start` | Producción: un único proceso Node sirve la web (`dist/`) y la API |
| `pnpm build:static` | Versión estática para Netlify u otro alojamiento sin Node (`dist-static/`, ver [Despliegue](#despliegue)) |
| `pnpm test` | Tests unitarios, de API y de componentes (Vitest) |
| `pnpm test:e2e` | Build + Playwright en escritorio, móvil vertical, **móvil horizontal** y **versión estática** (sin API), con axe |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm admin …` | Administración por terminal: `stock`, `stock:set <SKU> <n>` (avisa a quien pidió «Avísame»), `orders`, `order <nº>`, `order:status <nº> <shipped\|cancelled>` |
| `pnpm assets:brand` | Regenera vectores, favicon, iconos y Open Graph desde los originales (requiere `potrace`) |
| `pnpm mockups` | Regenera las fotos de producto provisionales: prenda lisa generada con IA + marcas oficiales compuestas (`--only <ids>`, `--preview <carpeta>`) |
| `node scripts/responsive-audit.mjs` | Auditoría responsive en 12 tamaños (320–1920 px y 3 móviles en horizontal) con capturas |

---

## Arquitectura

```
assets/brand/original/   Archivos oficiales de marca, intactos
public/assets/brand/     Logotipos SVG para uso externo
public/assets/products/  Mockups generados (mockups/<handle>/<color>-<vista>-<480|960>.webp)
scripts/                 Pipeline de marca, mockups, sitemap, administración y auditoría responsive
shared/                  Común web + API: tipos, catálogo, precios, validación (zod), rutas, SEO
server/                  API Hono + node:sqlite: catálogo/stock, checkout, webhook, cuentas, formularios
src/
  components/brand/      Logotipo, monograma, estrella, mascota y planos de marca (BrandPanel)
  components/commerce/   Tarjeta, grid, filtros, variantes, carrito, zoom, avisos de stock
  components/layout/     Header + mega menú, menú móvil, buscador, footer, consentimiento de cookies
  components/motion/     Reveal, SplitHeadline, Parallax, Marquee, intro de marca
  content/               Textos editables (campaign.ts), navegación, guía de tallas, páginas legales
  pages/                 Páginas (bajo demanda) y cuenta de usuario (pages/account)
  sections/home/         Secciones de la portada
  store/                 Estado con zustand: carrito, favoritos, stock en vivo, sesión, consentimiento
  styles/                Tokens, base, tipografía, layout, transiciones
tests/e2e/               Playwright
```

**Stack:** React 19, TypeScript, Vite 7, React Router 7, GSAP 3 (ScrollTrigger, SplitText), zustand, zod 4, Hono, `node:sqlite`, Stripe Checkout, Resend (opcional), Lucide, Inter y Archivo autoalojadas.

Decisiones relevantes:

- **El servidor manda:** el cliente solo envía `producto + color + talla + cantidad`. La API recalcula precios, envío y stock (`server/orders.ts`), y está probado contra manipulación de precios.
- **Inventario real:** el stock vive en la base de datos.
  - Se **reserva** al crear la sesión de pago, en una transacción `BEGIN IMMEDIATE`, así que no hay dos compras de la última unidad.
  - Se **libera** si el pago caduca o falla (webhook o barrido cada 60 s) y se **confirma** con el webhook firmado.
  - Cada intento de checkout lleva un `checkoutId`, de modo que repetir la petición reutiliza la sesión y nunca duplica pedidos.
- **SEO en una SPA:** el servidor inyecta en el HTML de cada ruta:
  - título, descripción, canonical y Open Graph;
  - JSON-LD (Organization, WebSite con SearchAction, Product con ofertas por variante, BreadcrumbList);
  - la **precarga de la imagen LCP**.

  Además devuelve 404 reales. Mientras `demoCatalog` esté activo, las fichas llevan `noindex`.
- **Seguridad:**
  - Contraseñas con scrypt; sesiones opacas en cookie `HttpOnly; SameSite=Lax` (`Secure` en producción).
  - CSRF por `Origin`/`Sec-Fetch-Site` y solo JSON; rate limiting por IP.
  - CSP estricta, HSTS y límite de tamaño de peticiones.
  - Webhook verificado, SQL parametrizado, honeypot anti-spam y ninguna clave en el frontend.
- **Analítica opcional y con consentimiento:**
  - Plausible o GA4 se activan por variable de entorno.
  - El banner de cookies solo aparece si hay proveedor; «Aceptar» y «Rechazar» tienen el mismo peso.
  - `purchase` solo se registra con el pago confirmado.

---

## Sistema de diseño y motion

La dirección visual sigue el **Manual de Marca HYPSOS** («negro + rojo, con control») con la estructura de la guía de estilo de referencia: tipografía gigante comprimida, bandas de color a sangre, píldoras con contorno de 1 px y pegatinas troqueladas. Todos los valores viven en `src/styles/tokens.css`:

- **Paleta del Manual:** HYPSOS Black `#090909` (campo dominante), HYPSOS Red `#D71920` (señal: acción principal, «Edición limitada», indicador activo; una vez por vista), Deep Red `#7A0F1D`, Off White `#F2F0EC` y Concrete Grey `#747474`. Temas por zona: `data-theme="light" | "dark" | "red"` (la banda roja, como mucho una por página).
- **Tipografía base (las 3 familias del Manual):** Archivo variable en sus dos extremos —comprimida al 62 % para titulares tipo cartel y **ancha al 125 %** para palabras que tienen que ocupar el ancho—, Inter para el texto y JetBrains Mono para capítulos, códigos, etiquetas y botones.
- **Familias de acento (añadidas a petición, fuera de las 3 del Manual; todas OFL vía Fontsource, solo latín y un peso):** cada una con un único papel, definido en `src/styles/typography.css` (`.t-gothic`, `.t-tag`, `.t-stencil`, `.t-marker`, y `.mix-*` para titulares de dos anchos):
  - **Grenze Gotisch** (gótica): nombres de capítulo y colección («Chapter», «Ascent», «Signal»).
  - **Sedgwick Ave Display** (tag de graffiti): pintadas decorativas, siempre `aria-hidden` y con el texto real en otro sitio.
  - **Big Shoulders Stencil Display** (stencil): cifras, índices y recuentos.
  - **Permanent Marker** (rotulador): notas cortas escritas a mano.
- **Forma:** botones en píldora, imágenes de producto a 14 px, tarjetas a 20–32 px. Sin sombras en tarjetas.
- **Espaciado:** base 4 px, márgenes laterales de 16 a 48 px, ritmo vertical fluido.
- **Motion:** duraciones `--dur-ui` (200 ms), `--dur-panel` (380 ms); en JavaScript, curvas propias de GSAP (`hyp.press`, `hyp.slap`, `hyp.drip`, `hyp.stroke`) en `src/lib/motion.ts`.

**Liquid Glass con refracción** (`src/components/ui/LiquidGlass.tsx`, `src/lib/liquid-glass.ts`): cabecera flotante, megamenú, búsqueda, carrito y cajones, modales, etiquetas y puntos sobre fotos, controles de galería.

- En Chromium (Chrome, Edge, Opera…) hay **refracción real**: un mapa de desplazamiento generado en canvas (perfil convexo tipo «squircle», ley de Snell con índice 1,5) se aplica con `backdrop-filter: url(#filtro)` y `feDisplacementMap`, con una ligera aberración cromática. El fondo se curva en el bisel y el centro queda plano y legible.
- **Cabecera = gota de agua** (perfil `drop`): toda la píldora actúa como lente; el borde comprime y el centro amplía lo que pasa por detrás (remapeo de Hermite monótono, sin inversiones). Al hacer scroll la gota «se carga» con la velocidad (más refracción) y al parar rebota con un muelle elástico (`useLiquidWobble`, que solo reescala el filtro, sin re-render).
- Safari y Firefox no admiten filtros SVG en `backdrop-filter`: reciben cristal con desenfoque y las mismas capas de luz, **sin refracción**.
- Con `prefers-reduced-transparency` el material pasa a sólido; con `prefers-reduced-motion` el brillo no sigue al puntero.
- Reglas: un cristal no va dentro de otro ni dentro de un ancestro con `opacity`, `filter`, `mask`, `clip-path` o **`view-transition-name`** (este último lo convierte en raíz del fondo y el cristal deja de ver la página).

**Portada** (por bandas, oversize y con graffiti): campaña en un túnel con graffiti, titular de dos anchos «BUILT FOR / THE CLIMB.», el capítulo «Ascent» pintado a espray, subrayado que gotea, pegatinas de HYPO y la estrella y puntos sobre las prendas → dos cintas de precinto cruzadas sobre el corte → Chapter 01 (gótica + stencil rodeado a espray, rejilla de producto) → categorías con índices stencil → lookbook «Above ordinary.» con corona a espray → detalle firma con la trabilla señalada a rotulador → cápsula Signal (tag negro sobre la banda roja) → **el muro**: manifiesto que se enciende con el scroll, foto pintando con espray, «keep climbing» pintado sobre el muro y rótulo gigante cortado. Marquesina superior con las frases del Manual y el aviso de demo.

**Sistema de movimiento** (JavaScript: GSAP con DrawSVG, ScrambleText, SplitText y CustomEase; canvas y SVG). Nada de fundidos, desenfoques ni deslizamientos de entrada; cada gesto imita un proceso físico:

- **Prensado** (`pressIn`): las letras de los titulares nacen aplastadas contra la línea base y se estampan con rebote.
- **Espray** (`src/lib/spray.ts`): las imágenes se pintan con una boquilla virtual en pasadas en zigzag (núcleo, bruma y gotas que perforan el color). La intro termina borrando la pantalla negra a espray.
- **Trazo y goteo** (`SprayMark`, `GraffitiTag`): círculos, subrayados, coronas y tags se dibujan a la velocidad de un brazo y después escurren con gravedad; textura de espray con un filtro SVG compartido (`#hyp-spray`).
- **Golpe** (`slap`): las pegatinas se estampan con un pequeño temblor del soporte.
- **Decodificación** (`Scramble`): las etiquetas técnicas giran como un panel de salidas.
- **Scroll**: cintas que aceleran, se inclinan e invierten según la velocidad; barrido rojo que se pinta con el scroll; manifiesto que se enciende palabra a palabra; paralaje moderado.
- **Puntero**: anillo con inercia (crece con etiqueta sobre imágenes de producto) y botones magnéticos con rebote elástico; luz del cristal que sigue al puntero.
- **Páginas**: transición de obturador (View Transitions): la nueva se abre desde una línea central y la anterior se hunde.

Accesibilidad y plataforma:

- Todo respeta `prefers-reduced-motion`: contenido estático y visible (la marquesina se detiene).
- Los `:hover` solo se aplican con ratón (`hover: hover` y `pointer: fine`).
- Controles táctiles sin retardo (`touch-action: manipulation`), campos de 16 px y márgenes seguros en horizontal.

Los textos de campaña (marquesina, hero, lookbook, detalle firma, cápsula, manifiesto) se editan en `src/content/campaign.ts` y salen del Manual de Marca (eslogan, frases secundarias, manifiesto y biografía).

### Fotografía de campaña (provisional, generada con IA)

Las fotos de campaña de `public/assets/campaign/` (túnel con graffiti, muro pintado a espray, escalera, azotea, looks en estudio, gorra, cargo, detalle de la trabilla, accesorios) **están generadas con IA** (Figma AI) como material provisional hasta la sesión de fotos. Las prendas que aparecen son lisas (sin los gráficos de HYPSOS) y **no representan ningún producto concreto**; por eso enlazan a categorías y no a fichas. La web lo indica junto a las fotos principales («Imágenes de campaña generadas con IA · provisionales»).

Para sustituirlas basta con dejar las fotos reales con el mismo nombre (`<nombre>-<ancho>.avif|webp`, anchos 640/960/original) o cambiar `shared/campaign.ts`. La foto o el vídeo oficial del hero va en `heroMedia`.

---

## Recursos de marca

Los originales están en `assets/brand/original/` y **no se modifican**. La web usa **solo las versiones planas** (logotipo, monograma H, estrella y mascota) en colores sólidos de la paleta: no hay versión metálica ni 3D del logotipo.

`pnpm assets:brand` traza los vectores con potrace y verifica su fidelidad frente al original (IoU ≥ 98,5 %, actualmente 99,45–99,96 %). Se pintan con `currentColor`, sin alterar forma ni proporciones. El script también genera el favicon, los iconos de app y la imagen Open Graph (monograma negro sobre plano claro + logotipo).

---

## Catálogo e imágenes

El catálogo está en `shared/catalog/`. Cada producto tiene:

- id, slug, nombre, descripciones, categoría y colecciones;
- precio en céntimos y moneda;
- colores, tallas y stock inicial por variante (SKU);
- estado de publicación, etiquetas, composición, cuidados y referencia comercial.

**Productos, precios, textos y stock son de ejemplo** (`store.demoCatalog = true` en `shared/config.ts`).

**Fotos de producto provisionales (no son fotografía real):** las prendas son **fotos de prenda lisa generadas con IA** (maniquí invisible sobre el fondo de estudio `#ECE9E3`, con la trabilla roja) y las marcas oficiales se **componen encima** para que parezcan serigrafiadas o bordadas: la tinta sigue los pliegues (mapa de desplazamiento), recibe la luz de la tela y deja ver su textura; el bordado lleva relieve, puntada y una sombra de 1 px. Ninguna prenda se ha fabricado ni fotografiado: sirven para construir la tienda y se sustituyen por fotos reales antes de vender. Las genera `pnpm mockups` (`scripts/mockups/`, `--only <ids>`, `--preview <carpeta>`):

- **Bases** en `scripts/mockups/bases/<tipo>-<color>-<cara>.webp` (960×1280), exportadas del archivo de Figma del proyecto. Las zonas de estampación de cada base están en `placements.ts`; el compositor en `photo.ts`.
- **Faltan bases**: solo hay camiseta negra y blanca (frente y espalda) y sudadera negra (frente). Mientras falten, se derivan (camiseta grafito y sudaderas gris, grafito y blanca teñidas desde la negra; espalda de sudadera reconstruida desde el frente; sudadera con cordones = sin cordones) y el resto de productos textiles (manga larga, pantalones, short, gorra, gorro, bolsa, calcetines) sigue con el **dibujo técnico plano** de antes. Basta con añadir la base que falta y volver a ejecutar `pnpm mockups`; la consola lista qué se ha sustituido.
- **Llavero, figura, monograma de escritorio y stickers** no tienen base: son una foto virtual hecha con filtros SVG en Chromium (`objects.ts`), con la silueta oficial sin redibujar.
- Las marcas son siempre las oficiales (`src/assets/brand/`): solo se escalan, giran, recolorean y deforman con la tela.
- WebP de 480 y 960 px (4:5): 216 imágenes, unos 3,2 MB en el repositorio y unos 7 KB por imagen en móvil.
- El texto alternativo dice «Mockup digital de…» y la ficha indica «Producto de demostración».

Para usar fotografías reales, sustituye en el producto `media: mockupViews` por:

```ts
media: [
  { type: 'image', src: '/assets/products/sudadera-capucha-ascenso/negro-1.webp', alt: 'Sudadera Ascenso negra, vista frontal', width: 1600, height: 2000, colorId: 'negro' },
],
```

**Políticas comerciales** (envíos, devoluciones, contacto, redes) en `shared/config.ts`:

- No hay ninguna inventada. Mientras `shippingMethods` esté vacío, el checkout no acepta pedidos y las páginas muestran «pendiente de confirmar».
- El único plazo que aparece es el legal de desistimiento (14 días).

---

## Pagos (Stripe)

1. Crea las claves en <https://dashboard.stripe.com/apikeys> (empieza en modo test) y define `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en `.env`.
2. Webhook en local: `stripe listen --forward-to localhost:8787/api/webhooks/stripe`. En producción, el endpoint es `https://TU-DOMINIO/api/webhooks/stripe` con estos eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
3. Configura las tarifas de envío reales en `shippingMethods` (`shared/config.ts`).

Flujo de un pedido:

1. Se valida el pedido y se reserva el stock.
2. Se crea la sesión de Stripe Checkout (caduca a los 31 minutos).
3. El webhook firmado marca el pedido como pagado (idempotente) y envía la confirmación por email si hay proveedor.
4. `/checkout/success` muestra el pedido y registra `purchase` en la analítica, si hay consentimiento.

---

## Cuentas de usuario

- **Acceso:** registro, inicio de sesión, cierre de sesión y recuperación de contraseña. El enlace de recuperación es de un solo uso, caduca a los 60 min y requiere `RESEND_API_KEY`.
- **Perfil:** datos personales, cambio de contraseña y borrado de cuenta.
- **Direcciones** guardadas (precargan el checkout), **historial de pedidos** y **favoritos sincronizados** entre dispositivos (los invitados los guardan en el navegador).

## Base de datos

SQLite (`DATABASE_PATH`) con migraciones automáticas (`user_version`). Tablas:

- `orders`, `inventory`
- `users`, `sessions`, `password_resets`, `addresses`, `wishlists`
- `stock_alerts`, `newsletter_subscribers`, `contact_messages`

Toda la persistencia pasa por la interfaz `Repositories` (`server/db.ts`). Para escalar a varias instancias se puede sustituir por Postgres sin tocar las rutas.

---

## Despliegue

### Tienda completa (servidor Node)

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production PUBLIC_URL=https://tu-dominio.com pnpm start
```

- Necesita **disco persistente** para SQLite (Render, Railway, Fly.io, un VPS…). En plataformas serverless, migra antes a Postgres.
- Detrás de un proxy propio, define `TRUST_PROXY=true`. Sin él, el rate limiting usa la IP de la conexión.
- Sirve siempre por HTTPS (se envía HSTS y la cookie de sesión es `Secure`).

Variables: ver `.env.example`. No hay secretos en el repositorio.

### Netlify (solo la web estática)

Netlify no ejecuta el servidor Node, así que ahí se publica la **versión estática**. `netlify.toml` ya lo configura: compila con `pnpm build:static` y publica `dist-static/`. **No publiques la carpeta del repositorio sin compilar** (por ejemplo, arrastrándola a Netlify Drop): el navegador recibiría `src/main.tsx` sin compilar y la web se quedaría en la pantalla de carga.

1. En Netlify: **Add new project → Import an existing project** y elige este repositorio y su rama. La configuración se lee de `netlify.toml`, no hay que tocar nada.
2. Para publicar a mano: `pnpm build:static` y sube la carpeta `dist-static/` (no la raíz del proyecto).

Qué incluye la versión estática:

- Funciona: catálogo, filtros, fichas con zoom, búsqueda, carrito y favoritos (guardados en el dispositivo).
- Cada ruta tiene su HTML con título, descripción, Open Graph y JSON-LD. Las rutas inexistentes devuelven un 404 real.
- No hay stock en vivo, pedidos, cuentas ni formularios: necesitan la API. La web lo indica en cada pantalla, sin simular nada.

Para la tienda completa con el dominio en Netlify, despliega la API en un host Node y cambia en `netlify.toml` la regla de `/api/*` por un proxy a ella (está comentado en el propio archivo).

---

## Calidad (verificado en este entorno)

- **`pnpm test`:** 81 tests. Cubren:
  - API: checkout, idempotencia, carrera por la última unidad, webhook repetido, CSRF, rate limiting y cuentas;
  - precios, stock, carrito, filtros e integridad del catálogo;
  - HTML/SEO y componentes.
- **`pnpm test:e2e`:** 65 escenarios (62 se ejecutan y 3 se omiten por aplicar solo a escritorio o a móvil) sobre el build de producción. Cubren:
  - navegación, todas las rutas, 404 reales y SEO;
  - filtros en la URL, paginación, variantes agotadas y «Avísame», zoom de galería;
  - compra hasta el aviso honesto de checkout no configurado;
  - cuentas, recuperación de contraseña, favoritos, buscador con teclado, newsletter y contacto;
  - ausencia de scripts de terceros sin consentimiento y movimiento reducido;
  - **axe (WCAG 2.1 AA) sin infracciones graves**;
  - una batería específica en **móvil horizontal**.
- **Auditoría responsive** (`scripts/responsive-audit.mjs`): 11 rutas × 12 tamaños (320, 375, 390, 430, 768, 1024, 1280, 1440, 1920, y 667×375, 844×390 y 932×430 en horizontal) sin scroll horizontal ni elementos fuera de pantalla.
- **Core Web Vitals medidos en laboratorio:** build de producción, Chromium emulando un Pixel 7, CPU 4× más lenta, mediana de 3 cargas de `/`, `/collections/all` y una ficha:

  | Red | LCP | CLS | INP (abrir menú) |
  | --- | --- | --- | --- |
  | 4G rápida (9 Mbps, 40 ms) | 1,44–1,55 s ✓ | 0–0,003 ✓ | 80–96 ms ✓ |
  | 4G lenta (1,6 Mbps, 150 ms; perfil tipo Lighthouse móvil) | 2,6–3,0 s ✗ | 0–0,003 ✓ | 80–104 ms ✓ |

  Con red lenta el LCP **no** cumple los 2,5 s. Ya se aplicaron dos mejoras:
  - las entradas animadas del contenido sobre el pliegue no lo ocultan;
  - el HTML precarga la imagen principal.

  El límite restante es que la web se renderiza en el cliente y necesita ~200 KB gzip de JS (React 102 KB, código 52 KB, GSAP 48 KB) antes de pintar. Ver pendientes. No son datos de campo: hay que confirmarlos con usuarios reales (CrUX o la analítica).

Los E2E de este entorno usan el Chromium del sistema: `PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chromium pnpm test:e2e`. En una máquina normal basta con `npx playwright install chromium`. **No se ha probado en dispositivos físicos**: el tacto, el notch y el teclado virtual deben revisarse en un móvil real.

---

## Pendientes antes de publicar

1. **Catálogo real:** productos, precios, textos, composiciones, tallas y stock. Después, `demoCatalog: false`.
2. **Fotografías reales** de producto (frontal, trasera, detalle y puesta) y de campaña. Sustituyen a las fotos de producto provisionales (prendas generadas con IA con las marcas compuestas, y dibujos técnicos donde aún no hay base) y a las fotos de campaña generadas con IA (ver «Fotografía de campaña»).
3. **Envíos:** tarifas, plazos y países confirmados con el operador logístico (`shippingMethods`).
4. **Stripe:** claves y webhook. Probar en modo test antes de activar el modo real.
5. **Email** (`RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_INBOX`): confirmaciones de pedido, recuperación de contraseña, avisos de stock y copia de los mensajes de contacto.
6. **Textos legales:** datos del titular (razón social, NIF, domicilio) y revisión profesional (`src/content/pages/Legal.tsx`).
7. **Atención al cliente:** email, plazo de respuesta y redes sociales (`shared/config.ts`).
8. **Rendimiento en redes lentas:** prerenderizar el HTML de las rutas principales (o SSR) y cargar GSAP bajo demanda para bajar el LCP de 2,5 s en 4G lenta.
9. **Textos de marca:** el eslogan, el manifiesto, los valores y la biografía salen del Manual; las descripciones de colecciones y productos siguen siendo borradores a validar.
10. **Catálogo según el Manual:** el Manual recomienda un primer drop corto (ASCENT TEE 01, CORE TEE 01, SUMMIT HOODIE 01, HYPOCAP 01, HYPOSTICKER SET 01). El catálogo de demostración aún tiene 20 piezas de ejemplo.
