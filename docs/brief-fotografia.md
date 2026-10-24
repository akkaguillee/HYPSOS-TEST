# Imágenes de HYPSOS: opciones y brief

Las fotos actuales son provisionales: fotos de campaña generadas con IA y reveladas para quitarles
el aspecto plástico, y mockups de producto compuestos sobre prendas lisas generadas con IA. Este
documento recoge cómo conseguir imágenes de calidad alta y qué tienen que mostrar para encajar con
el sistema visual (foto editorial a sangre, negro, rojo y blanco, sin graffiti).

## Opciones, de mejor a peor

| Opción | Calidad | Coste | Qué hace falta |
|---|---|---|---|
| **1. Sesión de fotos real** (modelo y producto) | La mejor. Es la única que muestra el producto de verdad, algo imprescindible antes de vender | Fotógrafo, modelo, estudio o localización | Muestras físicas de las prendas. Usar la lista de tomas de abajo |
| **2. Packs de mockup profesionales** (PSD con objeto inteligente) | Muy alta en producto: prendas fotografiadas de verdad | 15–60 € por pack, con licencia comercial | Exportar las prendas lisas a PNG y dejarlas en `scripts/mockups/bases/`. `pnpm mockups` compone encima los gráficos oficiales |
| **3. Figma** (bases ya generadas) | Alta (960×1280) | Gratis: las 25 bases que faltan ya están generadas | Permitir `www.figma.com` en la red del entorno y ejecutar `pnpm mockups:bases && pnpm mockups`. Los enlaces caducan hacia el 29–30 de octubre de 2026 |
| **4. Weave** (Nano Banana 2.1 / Pro, hasta 4K) | Alta | Unos 10 créditos por imagen a 2K (quedan 140) | Permitir `media.weavy.ai` en la red del entorno. La primera prueba (manga larga negra) ya está generada y pendiente de descarga |
| **5. API de Gemini** (Imagen / Gemini Image) | Alta | Pago por imagen, en la cuenta de Google del cliente | Guardar la clave como secreto del entorno (`GEMINI_API_KEY`) y usar `pnpm campaign:generate` (ver README). `generativelanguage.googleapis.com` sí responde desde aquí |
| **6. Adobe Stock** (vía el conector de Adobe) | Fotos reales de banco | Licencia por imagen | Solo para fondos y texturas. No sirve para el producto (no muestra las prendas de HYPSOS). El conector no genera imágenes |

Cualquier generador externo (Midjourney, Firefly en la web, etc.) también sirve: basta con subir
aquí los archivos y se integran igual.

## Brief de campaña (editorial)

- **Sujeto:** una sola persona por foto (dos como mucho), de perfil o tres cuartos, con la mirada
  fuera de cámara. Movimiento en la tela (capucha, bajo del cargo) o en el pelo.
- **Luz:** una sola fuente dura y lateral; la otra mitad cae a negro. Cuando haya color, que lo
  ponga la luz: gel rojo (tipo `#e90c17`) o ciudad de noche. Nada de luz plana de mediodía.
- **Escenario:** hormigón, escaleras, azoteas, ciudad de noche, estudio negro. **Sin
  graffiti** ni muros pintados.
- **Ropa:** siluetas oversize, cropped y anchas. Prendas de HYPSOS con su gráfico real y la
  trabilla roja visible en alguna toma.
- **Acabado:** negros profundos, piel natural (poros, sin suavizado), grano fino, sin HDR.
- **Formatos:** hero apaisado 16:9 de al menos 3000 px de ancho, con el sujeto descentrado a la
  derecha y aire a la izquierda. Looks en vertical 4:5 de al menos 2000 px de alto. Un retrato
  cuadrado para el marco circular.

### Lista de tomas para la web

1. Hero 16:9: dos figuras en escalera o azotea, luz lateral dura.
2. Look 01 (4:5): camiseta oversize + cargo, cuerpo entero, fondo de estudio.
3. Look 02 (4:5): cargo ancho en movimiento (escalera).
4. Retrato (1:1): gorra + camiseta, primer plano, para el círculo.
5. Macro de la trabilla roja en el bajo o el cuello (1:1).
6. Cápsula Signal (16:10): figura de espaldas, ciudad de noche.
7. Una imagen por categoría (4:5): sudaderas, camisetas, pantalones, gorras, accesorios.

## Brief de producto (mockups y fichas)

- **Fondo:** gris cálido de estudio `#ece9e3`, sin costuras, o blanco puro. Siempre el mismo.
- **Montaje:** maniquí invisible o plano cenital. Frontal, trasera y detalle por color.
- **Corte:** oversize y baggy (hombros caídos, cuerpo ancho, bajos amplios).
- **Detalle firma:** trabilla roja tejida en la costura lateral del bajo, siempre en el mismo lado.
- **Tamaño:** al menos 960×1280. Mejor 2400×3000, que el pipeline reduce.
- **Prendas lisas para componer:** sin gráficos. `pnpm mockups` estampa encima las marcas oficiales
  (serigrafía, bordado o vinilo).

### Prompt de base de producto (Weave, Gemini o cualquier generador)

> Studio e-commerce product photograph, invisible ghost mannequin, no person, front view, centred,
> whole garment visible with generous margin, warm light-grey seamless background (#ece9e3), soft
> natural studio light. Blank black heavyweight cotton OVERSIZED {prenda}: boxy wide body, dropped
> shoulders, baggy fit. One small red woven label tab sewn into the hem side seam on the right side
> of the image. No logos, no text, no prints. Photorealistic fabric texture, natural creases.

### Prompt de campaña

> Editorial fashion photograph, single model in a black oversized hoodie and wide black cargo
> pants, three-quarter pose, looking away from camera, standing on raw concrete stairs, one hard
> side light with deep black shadows, subtle red light spill, natural skin texture with pores, fine
> film grain, 35mm, no graffiti, no text, no logos.
