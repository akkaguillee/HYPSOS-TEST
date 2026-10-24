# Tipografías de HYPSOS

La web usa dos familias de marca y, para el texto corrido, la fuente del sistema del visitante
(no se descarga ninguna otra).

| Familia | Archivo | Uso | Licencia |
|---|---|---|---|
| **Bastaman** (Bold) | `bastaman.woff2` (en el repositorio) | Titulares, navegación, botones, etiquetas, precios | Autor: Mohamad Farhan Ramadhan. El archivo permite incrustarla (`fsType 0`), pero no trae texto de licencia: **confirma con el autor que la licencia cubre el uso comercial** antes de lanzar la tienda. |
| **Aerosoldier Basic** | `licensed/aerosoldier.woff2` (**fuera del repositorio**) | Palabras de acento (nombre del capítulo, firmas) | El archivo recibido es la versión **PERSONAL USE ONLY**: prohíbe el uso comercial y la incrustación (`fsType` restringido) y sustituye las cifras por una marca de agua. Hay que comprar la licencia comercial en https://mn.sg/aerosoldier. |

## Activar Aerosoldier

1. Compra la licencia comercial (que incluya uso web) y descarga el archivo.
2. Conviértelo a WOFF2 y guárdalo como `src/assets/fonts/licensed/aerosoldier.woff2`.
3. Si la licencia permite subir el archivo al repositorio, quita la regla de `.gitignore`; si no,
   añádelo en el despliegue (por ejemplo, como paso de build con un secreto).

Mientras el archivo no esté, `src/lib/fonts.ts` no lo pide y las palabras de acento se ven en
Bastaman. Aunque esté, las cifras nunca se pintan en Aerosoldier (se excluyen con `unicode-range`).

## Limitaciones de Bastaman

- Solo tiene mayúsculas (las minúsculas son las mismas letras) y un peso (Bold).
- No incluye `¿ ¡ « » · – —`: esos signos salen de la fuente del sistema. En titulares conviene
  evitarlos.
