# Tipografías de HYPSOS

La web usa solo dos familias: Bastaman para todo el texto y Aerosoldier para las palabras de acento.

| Familia | Archivo | Uso | Licencia |
|---|---|---|---|
| **Bastaman** (Bold) | `bastaman.woff2` (en el repositorio) | Todo el texto: titulares, interfaz, precios y párrafos | Autor: Mohamad Farhan Ramadhan. El archivo permite incrustarla (`fsType 0`), pero no trae texto de licencia: **confirma con el autor que la licencia cubre el uso comercial** antes de lanzar la tienda. |
| **Aerosoldier Basic** | `licensed/aerosoldier.woff2` (**fuera del repositorio**) | Una palabra de acento por titular, nombres de colección | El archivo recibido es la versión **PERSONAL USE ONLY**: prohíbe el uso comercial y la incrustación (`fsType` restringido) y sustituye las cifras por una marca de agua. Hay que comprar la licencia comercial en https://mn.sg/aerosoldier. |

## Activar Aerosoldier

1. Compra la licencia comercial (que incluya uso web) y descarga el archivo.
2. Conviértelo a WOFF2 y guárdalo como `src/assets/fonts/licensed/aerosoldier.woff2`.
3. Si la licencia permite subir el archivo al repositorio, quita la regla de `.gitignore`; si no,
   añádelo en el despliegue (por ejemplo, como paso de build con un secreto).

Mientras el archivo no esté, `src/lib/fonts.ts` no lo pide y las palabras de acento se ven en
Bastaman. Aunque esté, las cifras nunca se pintan en Aerosoldier (se excluyen con `unicode-range`).

## Limitaciones de Bastaman

- Solo tiene mayúsculas (las minúsculas son las mismas letras) y un peso (Bold).
- No incluye `¿ ¡ « » · – —`: esos signos salen de la fuente del sistema. En los textos de la web
  los separadores son barras («Negro / Talla M»); en el packaging el ¿ se compone con un ? girado.
