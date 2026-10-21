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

export async function apiRequest<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', NETWORK_MESSAGE);
  }

  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    // Respuesta sin JSON (p. ej. la API no está arrancada y responde el servidor de estáticos).
  }

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
