import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseAvailability } from '@/store/inventory';
import { ApiError, apiRequest, resetBackendDetection } from './api';

function mockFetch(body: string, init: { status?: number; type?: string }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status: init.status ?? 200, headers: { 'content-type': init.type ?? 'application/json' } })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetBackendDetection();
});

describe('apiRequest en un alojamiento sin API', () => {
  it('una página HTML con 200 (fallback SPA) no es un éxito', async () => {
    mockFetch('<!doctype html><html></html>', { type: 'text/html' });
    await expect(apiRequest('/inventory')).rejects.toMatchObject({ code: 'backend_unavailable', status: 503 });
  });

  it('un 404 HTML del alojamiento estático indica que el servidor no está disponible', async () => {
    mockFetch('<h1>Not found</h1>', { status: 404, type: 'text/html' });
    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'backend_unavailable' });
  });

  it('respeta el JSON de error de la regla /api/* de netlify.toml', async () => {
    mockFetch(JSON.stringify({ error: 'backend_unavailable', message: 'Sin servidor' }), { status: 404 });
    const error = await apiRequest('/store-status').catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'backend_unavailable', message: 'Sin servidor' });
  });

  it('un 502 sin JSON de un proxy es un error de servidor, no "sin API"', async () => {
    mockFetch('Bad gateway', { status: 502, type: 'text/plain' });
    await expect(apiRequest('/inventory')).rejects.toMatchObject({ code: 'server_error', status: 502 });
  });

  it('tras detectar que no hay API no repite peticiones que fallarán', async () => {
    mockFetch('<!doctype html>', { type: 'text/html' });
    await expect(apiRequest('/inventory')).rejects.toMatchObject({ code: 'backend_unavailable' });
    await expect(apiRequest('/auth/me')).rejects.toMatchObject({ code: 'backend_unavailable' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('devuelve el JSON de una respuesta correcta', async () => {
    mockFetch(JSON.stringify({ ok: true }), {});
    await expect(apiRequest<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true });
  });
});

describe('parseAvailability', () => {
  it('acepta un mapa SKU → unidades enteras', () => {
    expect(parseAvailability({ 'p:negro:M': 3, 'p:negro:L': 0 })).toEqual({ 'p:negro:M': 3, 'p:negro:L': 0 });
  });

  it('rechaza respuestas con otra forma en lugar de inventar disponibilidad', () => {
    expect(parseAvailability(undefined)).toBeNull();
    expect(parseAvailability('<html>')).toBeNull();
    expect(parseAvailability([1, 2])).toBeNull();
    expect(parseAvailability({ 'p:negro:M': '3' })).toBeNull();
    expect(parseAvailability({ 'p:negro:M': -1 })).toBeNull();
  });
});
