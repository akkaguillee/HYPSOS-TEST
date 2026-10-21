# Referencias de diseño para HYPSOS

## Método

- **WebFetch no funcionó con ninguna de las siete webs.** Todas las peticiones fallaron por DNS (`getaddrinfo ENOTFOUND`), y también falló una URL de control (`example.com`). Desde este sandbox la herramienta no tiene salida a internet. No se pudo hacer ninguna captura de pantalla.
- **Fuente alternativa: WebSearch.** Da títulos y URLs indexados y resúmenes de copias en caché de fechas distintas. Todo lo de abajo es **evidencia indirecta (E)**: sirve para la estructura (URLs, colecciones, filtros, políticas), pero **no muestra** el diseño visual, el orden de la home, el header, el movimiento ni el comportamiento sticky. Donde falta, se escribe "sin evidencia".
- Lo marcado como **(C)** es criterio propio y no se ha observado en ninguna referencia.

| Sitio | WebFetch | Evidencia indirecta (WebSearch) |
|---|---|---|
| Nike ES | No accesible | Categorías, filtros, guías de tallas, SNKRS |
| Apple iPhone | No accesible | Estructura de subpáginas (comparar, comprar) |
| Scuffers | No accesible | Colecciones, drops, stock, PDP, envíos |
| Corteiz | No accesible | Colecciones por fecha, nombres, guías de tallas |
| Represent | No accesible | Escasa y de fiabilidad dudosa (ver nota) |
| Gymshark ES | No accesible | Filtros y orden, PDP, envíos, reseñas |
| A-COLD-WALL* | No accesible | Colecciones, PDP, envíos y devoluciones |

---

## Nike (nike.com/es)

1. **Navegación:** sin evidencia del header ni del megamenú.
2. **Home:** sin evidencia.
3. **Categorías:** hay landings indexables que combinan género, uso y tipo, con títulos descriptivos ("Zapatillas para hombre. Nike ES"): Lifestyle, Running, Baloncesto, Gimnasio, Jordan, Nuevo y Ofertas. Los filtros indexados son género, precio, descuentos y ofertas, talla, color, altura de la zapatilla y "Personalizar". Algunas páginas añaden "Colecciones" y deporte. El orden de resultados no se pudo confirmar.
4. **PDP:** sin evidencia de la ficha. Las guías de tallas están en páginas propias por tipo (`/es/size-fit/...`) e incluyen consejos del tipo "si está entre dos tallas… la más grande".
5. **Tono:** directo, en segunda persona.
6. **Drops y comunidad:** hay un calendario SNKRS (`/es/launch`) con un segmento "upcoming" y lanzamientos con fecha y hora. La ayuda recomienda activar **"NOTIFÍCAME"** en cada modelo. Las ventajas de miembro están ligadas a la logística: página "Opciones de envío solo para Members", envío estándar gratuito y 30 días de devolución.

## Apple (apple.com/iphone)

1–2. **Navegación y home:** sin evidencia de la subnavegación, el hero ni el orden de secciones.
3. **Estructura:** el recorrido de compra está repartido en subpáginas, cada una para una decisión: `/iphone/compare/` (**"Comparar modelos"**, comparación lado a lado), `/iphone/buy/` (**"Comprar un iPhone"**) y `/es/iphone/more/` (**"¿Por qué el iPhone?"**).
4. **Compra directa:** financiación, permuta, equipo libre y configuración asistida (datos en parte de EE. UU.).
5–6. Sin evidencia de tono, drops ni stock.

## Scuffers (scuffers.com/es)

1–2. **Navegación y home:** sin evidencia del orden. Sí hay evidencia de colecciones destacadas: **New Arrivals**, **Best Sellers** y **Back in Stock**.
3. **Colecciones:** la página "Sudaderas" muestra el **número de productos** junto al título (unos 195) y usa **paginación por URL** (`?page=4`). También hay colecciones fijas: all, crewnecks, woman y back-in-stock. El umbral de envío gratis aparece en la propia colección (más de 150 €).
4. **PDP:** guía de tallas **por producto** con tabla en cm y pulgadas, altura del modelo y talla que lleva, y consejos de fit ("una o dos tallas más grandes" en un pantalón ancho). En la ficha figuran los plazos de entrega: **24–48 h en España y Portugal**, 3–5 días en Europa, y hora de corte a las 13:00 CET. Devoluciones en 14 días, con el **primer cambio gratis en la península**.
5. **Tono:** el nombre de las secciones mezcla inglés y español (p. ej. "Back to Basics Drop").
6. **Drops:** cada drop es una **colección propia con URL**: `drop-4-ss25`, `d5-ss26`, "CLG Drop", "Gallery Drop" y una landing `ss26-collection?collection=drop-2-ss26`. En las tarjetas aparecen los estados **"Back in stock"** y **"Sold out"**. Se avisa de que hay unidades limitadas por drop, y la newsletter se ofrece para restocks y eventos.
   **Fallo observado:** algunas copias de la versión `/es` mostraban precios en USD. La moneda no siempre coincide con el mercado.

## Corteiz (corteiz.com)

1–2. **Navegación y home:** sin evidencia. La home indexada muestra directamente un listado de productos.
3. **Colecciones:** por categoría y en mayúsculas (NEW, JACKETS, SHORTS, ACCESSORIES, WOMENS). Cada drop es una **colección nombrada con su fecha** (`05.07.26`, `02.08.26`, `29.05.26`).
4. **PDP:** el nombre sigue un patrón fijo, con el color entre corchetes ("TEXT ME BACK TEE [WHITE]"). Las **guías de tallas son páginas propias por prenda** ("T-Shirt Size Guide") con medida de axila a axila y largo. La ficha incluye una nota de fit ("boxy relaxed fit", "size down") y una sección "Shipping Policy".
5. **Tono:** muy escueto, todo en mayúsculas y casi sin texto de marketing.
6. **Stock:** algunos artículos aparecen como agotados. Los precios están en GBP y USD según la versión.

## Represent (representwear.com)

**Fiabilidad baja.** El dominio tiene artículos promocionales ("cómo saber si es falso") y políticas contradictorias (7 frente a 30 días de devolución). La búsqueda apunta a que la tienda oficial es **representclo.com**; hay que verificarlo antes de usar Represent como referencia.

- La página afirma: drops semanales, guía de tallas en la PDP (pecho, hombros, largo) y corte oversize.
- **Owners Club** es una línea de producto (lo confirman END., Footshop y representclo.com). Que sea además un programa de fidelidad con acceso anticipado solo lo dice representwear.com, sin verificar.

## Gymshark (eu.gymshark.com/es-ES)

1–2. **Navegación y home:** sin evidencia de la home. Hay colecciones transversales: new-releases (con subrutas para hombre y mujer), must-have, last-chance (outlet), collabs y matching-sets.
3. **Panel "Filtrar y ordenar":**
   - **Orden:** precio ascendente y descendente, relevancia, novedades y % de descuento.
   - **Filtros:** talla (XXS–3XL, talla única y cintura), **color con recuento por tono**, **fit** (slim, oversized, boxy, regular), nivel de sujeción, largo, género, características, actividad, línea, descuento y precio.
   - La página de novedades de mujer muestra el total de productos (111).
4. **PDP:** mensaje de cabecera **"entrega al día siguiente y devoluciones gratuitas"**, **"Envío Estándar Gratuito A Partir De €75"** y 30 días de devolución gratuita con excepciones. Hay reseñas con nota media y número de opiniones, y un **veredicto de talla agregado** (talla normal según N reseñas). Se ofrece un descuento por suscribirse a la newsletter (10–15 % en el primer pedido).
5. **Tono:** cercano y orientado al beneficio.
6. **Restock:** se anuncia con fecha concreta ("Onyx V1 returns July 16th").

## A-COLD-WALL* (a-cold-wall.com)

1–2. **Navegación y home:** sin evidencia. Colecciones: Shop All, New Arrivals, Outerwear, Sweats, Outlet, temporada (AW25) y colaboración (ACW* Arsenal).
3. **Colecciones:** sin evidencia de filtros ni orden.
4. **PDP:** el nombre va seguido de un color descriptivo ("Docklands Light Down Jacket Bone", Onyx, Moss). Cada prenda tiene su **tabla de medidas** (largo, manga, hombro y pecho, de XS a XXL) y se indica la altura del modelo y la talla que lleva. El texto describe el material con detalle técnico (ripstop, capa 3L). Los envíos son internacionales DDU, con gastos calculados en el checkout y entrega con firma. Hay un **portal de devoluciones aparte**.
5. **Tono:** técnico y sobrio, centrado en el material.
6. **Fallo observado:** el plazo de devolución no coincide entre páginas (28 días en la política, 14 en una PDP).

---

## Principios aplicables a HYPSOS

1. **El drop como entidad con URL propia.** Cada lanzamiento es una colección permanente con código propio (p. ej. `/drops/hyp-01`) y página que se puede compartir y archivar, no solo una etiqueta. — Corteiz, Scuffers (E)
2. **Calendario con fecha y hora en CET y botón "Avísame".** Antes del lanzamiento, la ficha muestra la fecha exacta y deja suscribirse a un aviso. Después pasa a "Disponible". — Nike SNKRS (E)
3. **El stock es un estado visible.** Tarjeta y ficha tienen estados claros y en español: "Agotado", "De vuelta" y "Últimas unidades", siempre que ese dato sea real. Habrá una colección fija "De vuelta" y los restocks se anuncian con fecha. — Scuffers, Gymshark (E)
4. **Escasez honesta.** Si hay pocas unidades, se dice cuántas (p. ej. "200 unidades"), sin contadores inventados. — Scuffers (E) + (C)
5. **Categorías como landings indexables.** Combinan género, tipo y uso, con títulos descriptivos en español. — Nike (E)
6. **Un único panel "Filtrar y ordenar".**
   - **Filtros:** talla, color con recuento, fit (oversize / boxy / regular), precio y drop.
   - **Orden:** novedades, precio ascendente y descendente, y relevancia.
   - El número total de productos aparece junto al título. En móvil, el panel se abre como hoja inferior (C).
   — Gymshark, Nike, Scuffers (E)
7. **Paginación con URL.** Si se usa "Cargar más", tiene que actualizar `?page=`, para poder compartir la página y no perder posicionamiento en buscadores. — Scuffers (E)
8. **La guía de tallas va junto al selector de talla.** Incluye una tabla en cm (ancho de pecho, largo y manga), la altura del modelo y la talla que lleva, y un consejo de fit por prenda ("Si dudas, pide tu talla habitual"). — Scuffers, Corteiz, A-COLD-WALL* (E)
9. **Veredicto de talla de la comunidad.** Cuando haya suficientes reseñas, se muestra un resumen ("Talla normal según 120 clientes"). — Gymshark (E)
10. **Entrega y devoluciones concretas en la ficha.** Se indica 24–48 h en península, la hora de corte, el umbral de envío gratis y el plazo de devolución. El umbral se repite en la barra de anuncio. — Scuffers, Gymshark (E)
11. **Una sola fuente de verdad para precios, moneda y políticas.** Todos los textos de envío, devolución y precio salen de la configuración compartida. Las referencias se contradicen (14 frente a 28 días, EUR frente a USD en la versión ES) y eso es lo que hay que evitar. — A-COLD-WALL*, Scuffers, Represent (E, lección negativa)
12. **Nombres de producto con un formato fijo.** Primero el modelo y después el color, con un separador propio (p. ej. "Sudadera Nocturna — Negro"). Ayuda a escanear las tarjetas y a buscar. — Corteiz, A-COLD-WALL* (E)
13. **Separar explorar, comparar y comprar.** Habrá una vista que compare fits y gramajes dentro de una familia (sudaderas) y un bloque breve "Por qué HYPSOS" con envío, cambios y calidad. — Apple (E)
14. **La comunidad tiene que dar algo concreto.** Suscribirse o ser miembro da acceso anticipado al drop y el primer cambio gratis, en lugar de un club meramente decorativo. — Nike Members, Scuffers (E); Represent (sin verificar)
15. **Movimiento y móvil.** No hay referencia verificada para esto, todo es criterio propio (C):
    - Transiciones de 150–250 ms, solo con `transform` y `opacity`, respetando `prefers-reduced-motion`.
    - En móvil, botón de compra fijo en la ficha y galería que se desliza en horizontal.
    - El rojo #C8102E se reserva para acciones y estados de drop.

## Qué no copiar

1. **Nombres de programas y líneas** como "Owners Club", "247", "SNKRS" o "Members", y eslóganes como "Just Do It". HYPSOS necesita nombres propios.
2. **El formato de drop por fecha `DD.MM.AA`**, que es la firma de Corteiz. Conviene usar un código propio (HYP-01, HYP-02…).
3. **Mayúsculas con el color entre corchetes** ("TEE [WHITE]") tal cual. Se puede tener una convención fija sin calcar esa.
4. **El asterisco y el lenguaje técnico-arquitectónico de A-COLD-WALL\*.** Es identidad de marca, no un patrón de interfaz.
5. **Logotipos, iconografía, fotografía de campaña y textos** de cualquiera de las referencias. Solo se aprovechan los principios de estructura.

---

**Fuentes (índice de búsqueda, consultado el 21-10-2026):** nike.com/es/w/hombre-zapatillas-nik1zy7ok · nike.com/es/launch · nike.com/es/inscripcion/envios · nike.com/es/size-fit/calzado-mujer · apple.com/iphone/compare · apple.com/iphone/buy · apple.com/es/iphone/more · scuffers.com/es/collections/hoodies · scuffers.com/collections/back-in-stock · scuffers.com/collections/drop-5-ss26 · scuffers.com/pages/returns-exchanges · corteiz.com/collections/02-08-26 · corteiz.com/pages/t-shirt-size-guide · representwear.com/faqs · representwear.com/return-policy · eu.gymshark.com/collections/tanks · eu.gymshark.com/collections/new-releases/womens · eu.gymshark.com/es-ES/products/gymshark-solo-leggings-black · a-cold-wall.com/collections/outerwear · a-cold-wall.com/products/heatwave-t-shirt-onyx · a-cold-wall.com/pages/delivery-returns
