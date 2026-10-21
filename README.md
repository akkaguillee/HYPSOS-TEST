# HYPSOS — Web y tienda online

Web de marca y e-commerce de **HYPSOS**: experiencia editorial con motion design (GSAP), catálogo con filtros, ficha de producto, carrito, checkout preparado para Stripe y API propia con base de datos.

> **Estado:** funcional de extremo a extremo con un **catálogo de ejemplo**. Antes de vender hay que completar los puntos de [Pendientes antes de publicar](#pendientes-antes-de-publicar).

---

## Puesta en marcha

Requisitos: **Node ≥ 22.13** (usa `node:sqlite`, incluido en Node) y **pnpm 10** (`corepack enable`).

```bash
pnpm install
cp .env.example .env      # opcional en local: los valores por defecto funcionan
pnpm dev                  # web en http://localhost:5173 + API en :8787
```

Sin claves de Stripe todo funciona salvo el pago: el checkout valida el pedido y responde que los pagos no están activados (no se crea ningún pedido ni se simula un cobro).

### Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Vite + API con recarga en caliente |
| `pnpm build` | Typecheck, build de la web, bundle de la API y `sitemap.xml` |
| `pnpm start` | Producción: un único proceso Node sirve la web (`dist/`) y la API |
| `pnpm test` | Tests unitarios y de componentes (Vitest) |
| `pnpm test:e2e` | Build + tests E2E con Playwright (escritorio y móvil) y auditoría de accesibilidad axe |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm assets:brand` | Regenera los recursos de marca desde los originales (requiere `potrace`) |

---

## Arquitectura

```
assets/brand/original/   Archivos oficiales de marca, intactos
public/                  Favicon, iconos, OG, robots, imágenes optimizadas (media/)
scripts/                 Pipeline de marca y generador de sitemap
shared/                  Código común web + API: tipos, catálogo, precios, validación (zod), rutas, SEO
server/                  API Hono: checkout, webhook de pagos, newsletter, contacto, SQLite, cabeceras de seguridad
src/
  assets/brand/          Vectores oficiales generados (no editar a mano)
  components/
    brand/               Logotipo, monograma, estrella, mascota, monograma cromado
    commerce/            Tarjeta, grid, carrusel, filtros, selectores de variante, carrito, guía de tallas
    layout/              Header + mega menú, menú móvil, buscador, footer, cabecera de página
    motion/              Reveal, SplitHeadline, Parallax, Marquee, intro de marca
    ui/                  Botones, campos, drawer, modal, acordeón…
  content/               Navegación, guía de tallas, páginas de contenido y textos legales
  hooks/  lib/  store/   Accesibilidad, motion, API, filtros; estado (carrito, favoritos) con zustand
  pages/                 Páginas (cargadas bajo demanda, salvo la portada)
  sections/home/         Secciones de la portada
  styles/                Tokens de diseño, base, tipografía, layout, transiciones
tests/e2e/               Playwright
```

**Stack:** React 19 + TypeScript + Vite 7 · React Router 7 · GSAP 3 (ScrollTrigger, SplitText) · zustand · zod · Hono + `node:sqlite` · Stripe Checkout · Lucide · Inter + Archivo (autoalojadas, sin peticiones a Google).

Decisiones relevantes:

- **Precios siempre en el servidor.** El cliente solo envía `producto + color + talla + cantidad`; la API recalcula precios, envío y stock con el catálogo (`server/orders.ts`). Probado contra manipulación de precios.
- **SEO en una SPA:** el servidor inyecta título, descripción, canonical, Open Graph y JSON-LD de producto en el HTML de cada ruta, y responde **404 reales** a rutas inexistentes. `sitemap.xml` y `robots.txt` se generan en el build.
- **Sin 3D en tiempo real (Three.js):** el monograma cromado oficial ya aporta la profundidad; un motor 3D añadiría ~150 KB sin beneficio claro.
- **Rendimiento:** la portada carga ~50 KB gzip de código propio + React (102 KB) + GSAP (49 KB), cada uno en su chunk cacheable; zod y el resto de páginas se cargan bajo demanda. Imágenes AVIF/WebP responsive con dimensiones fijas (sin saltos de layout).
- **Seguridad:** CSP estricta para scripts, HSTS, `nosniff`, límite de tamaño de peticiones, rate limiting en formularios y checkout, honeypot anti-spam, firma verificada en el webhook, consultas SQL parametrizadas.

---

## Sistema de diseño

Todos los valores viven en `src/styles/tokens.css`: paleta (negro `#080808`, blanco, rojo `#C8102E` como acento), espaciado en base 4 px, márgenes laterales adaptativos (16 → 48 px), escala tipográfica fluida, duraciones y curvas de animación, capas. Las secciones con `data-theme="light"` invierten los tokens para las pausas editoriales en claro.

Tipografía: **Archivo** expandida (titulares) + **Inter** (texto). Clases de jerarquía en `src/styles/typography.css` (`t-campaign`, `t-display`, `t-h1`… `t-label`).

Motion: duraciones espejo en `src/lib/motion.ts`. Todo respeta `prefers-reduced-motion` (sin parallax, sin bucles, contenido visible). La intro de marca solo aparece en la primera visita de la sesión a la portada, dura ~1,6 s, se puede saltar y nunca bloquea la carga.

---

## Recursos de marca

Los archivos recibidos están en `assets/brand/original/` y **no se modifican**. `pnpm assets:brand` genera:

- **Vectores SVG** del logotipo, monograma H, estrella y mascota, trazados con potrace a partir de los píxeles originales. El script verifica la fidelidad comparando cada vector con su original (IoU 99,45–99,96 %) y falla si baja del 98,5 %. Se pintan con `currentColor`, así que el **mismo trazado** se presenta en negro sobre claro o en blanco sobre oscuro sin alterar la forma.
- **Mascota:** además del trazo blanco se calcula su silueta exterior (relleno negro), igual que en el archivo original, para que se lea sobre cualquier fondo.
- **Monograma cromado** en AVIF/WebP (640/1080/1480 px), favicon (monograma, adaptado a modo claro/oscuro del navegador), iconos de app e imagen Open Graph.

> Solo recibimos el logotipo en negro. La versión blanca de la web es ese mismo trazado coloreado con CSS; si existe una versión oficial para fondos oscuros, basta con sustituir el original y ejecutar `pnpm assets:brand`.

---

## Catálogo y fotografías

El catálogo está en `shared/catalog/` (`products.ts`, `categories.ts`, `collections.ts`). **Productos, precios, textos y stock son de ejemplo.**

Mientras no hay fotos, cada producto muestra un **boceto técnico vectorial** en el color elegido, marcado como «IMAGEN PENDIENTE». Para usar fotografías reales:

1. Guarda las imágenes en `public/media/products/<handle>/` (recomendado: 1600×2000 px, 4:5, WebP/AVIF).
2. Sustituye en el producto `media: placeholderViews` por:

```ts
media: [
  { type: 'image', src: '/media/products/sudadera-capucha-ascenso/negro-1.webp', alt: 'Sudadera Ascenso negra, vista frontal', width: 1600, height: 2000, colorId: 'negro' },
  { type: 'image', src: '/media/products/sudadera-capucha-ascenso/negro-2.webp', alt: 'Detalle del bordado', width: 1600, height: 2000, colorId: 'negro' },
],
```

Las imágenes con `colorId` se muestran al elegir ese color; sin `colorId` valen para todos. Los tests de `shared/catalog/catalog.test.ts` comprueban que no falten variantes de stock ni haya referencias duplicadas.

Envíos, umbral de envío gratis, países, plazo de devolución y redes sociales: `shared/config.ts`.

---

## Pagos (Stripe)

1. Crea las claves en <https://dashboard.stripe.com/apikeys> (empieza en modo test).
2. En `.env`: `STRIPE_SECRET_KEY=sk_test_…` y el secreto del webhook.
3. Webhook en local: `stripe listen --forward-to localhost:8787/api/webhooks/stripe` (copia el `whsec_…` que imprime). En producción, crea el endpoint `https://TU-DOMINIO/api/webhooks/stripe` con los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`.

Flujo: el checkout valida datos y stock → la API crea el pedido (`pending_payment`) y una sesión de Stripe Checkout → el cliente paga en la página de Stripe → el webhook firmado marca el pedido como `paid` → `/checkout/success` muestra la confirmación y vacía el carrito. Los métodos de pago (tarjeta, Apple Pay, Google Pay…) se activan desde el panel de Stripe.

---

## Base de datos

SQLite (`DATABASE_PATH`, por defecto `./data/hypsos.db`) con migraciones automáticas al arrancar. Tablas: `orders`, `newsletter_subscribers`, `contact_messages`. Toda la persistencia pasa por la interfaz `Repositories` de `server/db.ts`: para escalar a varias instancias, se sustituye por Postgres sin tocar las rutas.

---

## Despliegue

Un único proceso Node sirve web y API:

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production PUBLIC_URL=https://tu-dominio.com pnpm start
```

- Necesita un host con **disco persistente** para SQLite (Render, Railway, Fly.io, un VPS…). En plataformas serverless (Vercel, Netlify) hay que migrar antes la base de datos a Postgres.
- Detrás de un proxy propio (Nginx, Render, Fly…) define `TRUST_PROXY=true` para que el rate limiting use la IP real.
- Sirve siempre por HTTPS (se envía HSTS).

Variables: ver `.env.example`.

---

## Calidad

- `pnpm test`: 60 tests (API, cálculo de precios, stock, carrito, filtros, validación, integridad del catálogo, componentes).
- `pnpm test:e2e`: 39 escenarios en escritorio y móvil sobre el build de producción: navegación, todas las rutas, 404 reales, SEO, filtros sincronizados con la URL, compra completa hasta el pago, favoritos, newsletter, contacto, teclado, movimiento reducido y **axe (WCAG 2.1 AA) sin infracciones graves**.

En este entorno los E2E usan el Chromium del sistema: `PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chromium pnpm test:e2e`. En una máquina normal basta `npx playwright install chromium`.

---

## Pendientes antes de publicar

1. **Catálogo real**: productos, precios, descripciones, composiciones, tallas y stock (`shared/catalog/products.ts`).
2. **Fotografías** de producto y campaña (ver [Catálogo y fotografías](#catálogo-y-fotografías)).
3. **Textos legales**: completar los datos marcados en rojo (titular, NIF, domicilio, email) y revisión por un profesional (`src/content/pages/Legal.tsx`).
4. **Email de atención al cliente** y **URLs de redes sociales** (`shared/config.ts`).
5. **Stripe**: claves y webhook (ver [Pagos](#pagos-stripe)).
6. **Emails transaccionales** (confirmación de pedido, aviso de mensajes de contacto, doble opt-in de newsletter): conectar un proveedor (Resend, Postmark…). Hoy los mensajes y suscripciones se guardan en la base de datos pero no se envía ningún email.
7. **Inventario**: el stock vive en el catálogo; con ventas reales debe pasar a la base de datos y descontarse en el webhook de pago.
8. **Envíos**: confirmar tarifas, plazos y países con el operador logístico (`shared/config.ts`).
9. **Analítica**: si se añade, incorporar antes un panel de consentimiento de cookies.
10. **Textos de marca** (manifiesto, «Quiénes somos», colecciones): son borradores a validar.
