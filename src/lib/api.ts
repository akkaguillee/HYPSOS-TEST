/** Cliente HTTP mínimo para la API de HYPSOS (/api). */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly payload: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
/** Solo para pruebas: restablece la detección de alojamiento sin API. */
export function resetBackendDetection() {
  backendMissing = false;
}

export const BACKEND_UNAVAILABLE_MESSAGE =
  'Esta función necesita el servidor de la tienda, que no está activo en esta versión de la web. Puedes seguir navegando por el catálogo.';

/** Se activa al detectar un alojamiento sin API: las siguientes peticiones fallan sin red. */
let backendMissing = false;

export async function apiRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  if (backendMissing) throw new ApiError(503, 'backend_unavailable', BACKEND_UNAVAILABLE_MESSAGE);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      credentials: 'same-origin',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', NETWORK_MESSAGE);
  }

  // Un alojamiento estático (Netlify, Vercel…) sin la API responde a /api/* con HTML o un 404:
  // eso nunca es un éxito, aunque el estado sea 200.
  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  let data: Record<string, unknown> = {};
  let parsed = false;
  if (isJson) {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        data = body as Record<string, unknown>;
        parsed = true;
      }
    } catch {
      // JSON inválido: se trata como servidor no disponible.
    }
  }

  if (!parsed) {
    // Sin cuerpo JSON no ha respondido la API: un 2xx/4xx viene del alojamiento estático (la API no
    // existe ahí); un 5xx, de un proxy con la API caída o reiniciándose.
    if (response.status >= 500) throw new ApiError(response.status, 'server_error', NETWORK_MESSAGE);
    backendMissing = true;
    throw new ApiError(503, 'backend_unavailable', BACKEND_UNAVAILABLE_MESSAGE);
  }
  if (!response.ok && data.error === 'backend_unavailable') backendMissing = true;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data.error === 'string' ? data.error : 'http_error',
      typeof data.message === 'string' ? data.message : response.status >= 500 ? NETWORK_MESSAGE : 'Ha ocurrido un error.',
      (data.fields as Record<string, string>) ?? {},
      data,
    );
  }
  return data as T;
}
