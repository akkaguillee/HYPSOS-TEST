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
| `pnpm test` | Tests unitarios, de API y de componentes (Vitest) |
| `pnpm test:e2e` | Build + Playwright en escritorio, móvil vertical y **móvil horizontal**, con axe |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm admin …` | Administración por terminal: `stock`, `stock:set <SKU> <n>` (avisa a quien pidió «Avísame»), `orders`, `order <nº>`, `order:status <nº> <shipped\|cancelled>` |
| `pnpm assets:brand` | Regenera vectores, favicon, iconos y Open Graph desde los originales (requiere `potrace`) |
| `pnpm mockups` | Regenera los mockups 2D de producto (`--only <ids>`, `--preview <carpeta>`) |
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

Todos los valores viven en `src/styles/tokens.css`:

- **Paleta:** `#080808`, `#F5F5F5`, rojo `#C8102E` como acento, `#242424`, grises, y `--c-studio` para el fondo de las imágenes de producto.
- **Espaciado:** base 4 px, con márgenes laterales de 16 a 48 px y ritmo vertical de sección fluido.
- **Tipografía:** escala fluida con Archivo expandida para titulares e Inter para texto.
- **Motion:** duraciones `--dur-ui` (200 ms), `--dur-panel` (380 ms) y `--dur-enter`/`--dur-editorial`, con curvas `--ease-out` y `--ease-drawer`.
- **Capas:** tokens de `z-index`.

**Motion graphics** (solo `transform`, `opacity` y `clip-path`):

- **Hero:** cartel rojo con el monograma H plano. Al terminar la intro, las marcas de corte se dibujan, un barrido de color descubre el cartel, el monograma sube, la estrella gira hasta su sitio y el titular se revela por líneas. Al hacer scroll hay paralaje por capas, y con ratón un paralaje leve.
- **«Sistema gráfico»:** las cuatro marcas en planos de color se descubren con un barrido escalonado, y cada una se mueve a su ritmo con el scroll.
- **Colecciones:** tarjetas con planos de marca (carrusel con scroll-snap en móvil).

Accesibilidad y plataforma:

- Todo respeta `prefers-reduced-motion`: contenido estático y visible.
- Los `:hover` solo se aplican con ratón (`hover: hover` y `pointer: fine`).
- Controles táctiles sin retardo (`touch-action: manipulation`), campos de 16 px y márgenes seguros en horizontal.

Los textos de campaña (avisos, hero, rótulos del cartel, ticker, manifiesto) se editan en `src/content/campaign.ts`. El hero acepta una foto o un vídeo de campaña en `hero.media`: en cuanto exista, sustituye al cartel.

---

## Recursos de marca

Los originales están en `assets/brand/original/` y **no se modifican**. La web usa **solo las versiones planas** (logotipo, monograma H, estrella y mascota) en colores sólidos de la paleta: no hay versión metálica ni 3D del logotipo.

`pnpm assets:brand` traza los vectores con potrace y verifica su fidelidad frente al original (IoU ≥ 98,5 %, actualmente 99,45–99,96 %). Se pintan con `currentColor`, sin alterar forma ni proporciones. El script también genera el favicon, los iconos de app y la imagen Open Graph (monograma blanco sobre plano rojo + logotipo).

---

## Catálogo e imágenes

El catálogo está en `shared/catalog/`. Cada producto tiene:

- id, slug, nombre, descripciones, categoría y colecciones;
- precio en céntimos y moneda;
- colores, tallas y stock inicial por variante (SKU);
- estado de publicación, etiquetas, composición, cuidados y referencia comercial.

**Productos, precios, textos y stock son de ejemplo** (`store.demoCatalog = true` en `shared/config.ts`).

**Mockups 2D:** mientras no haya fotografía, cada producto muestra un mockup digital en flat lay de estudio, en el color elegido y en tres vistas (delantera, trasera y detalle). Los genera `pnpm mockups` (`scripts/mockups/`):

- Usa las marcas oficiales como serigrafía, bordado o etiqueta tejida, sin redibujarlas.
- Se rasteriza con Chromium a WebP de 480 y 960 px: 108 imágenes, unos 4,5 MB en el repositorio y unos 9 KB por imagen en móvil.
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

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production PUBLIC_URL=https://tu-dominio.com pnpm start
```

- Necesita **disco persistente** para SQLite (Render, Railway, Fly.io, un VPS…). En plataformas serverless, migra antes a Postgres.
- Detrás de un proxy propio, define `TRUST_PROXY=true`. Sin él, el rate limiting usa la IP de la conexión.
- Sirve siempre por HTTPS (se envía HSTS y la cookie de sesión es `Secure`).

Variables: ver `.env.example`. No hay secretos en el repositorio.

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
2. **Fotografías** de producto y de campaña. Sustituyen automáticamente a los mockups y al cartel del hero.
3. **Envíos:** tarifas, plazos y países confirmados con el operador logístico (`shippingMethods`).
4. **Stripe:** claves y webhook. Probar en modo test antes de activar el modo real.
5. **Email** (`RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_INBOX`): confirmaciones de pedido, recuperación de contraseña, avisos de stock y copia de los mensajes de contacto.
6. **Textos legales:** datos del titular (razón social, NIF, domicilio) y revisión profesional (`src/content/pages/Legal.tsx`).
7. **Atención al cliente:** email, plazo de respuesta y redes sociales (`shared/config.ts`).
8. **Rendimiento en redes lentas:** prerenderizar el HTML de las rutas principales (o SSR) y cargar GSAP bajo demanda para bajar el LCP de 2,5 s en 4G lenta.
9. **Textos de marca** (manifiesto, «Quiénes somos», colecciones): son borradores a validar.
