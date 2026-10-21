import type { Context, MiddlewareHandler } from 'hono';

/**
 * Limitador de peticiones en memoria por IP y ruta (ventana fija).
 * Suficiente para una única instancia; con varias instancias usar Redis o el
 * limitador del proveedor (Cloudflare, Fly, etc.).
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFor: (c: Context) => string;
}): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }
    const key = `${c.req.path}|${options.keyFor(c)}`;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
    } else {
      entry.count += 1;
      if (entry.count > options.max) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return c.json({ error: 'rate_limited', message: 'Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.' }, 429);
      }
    }
    await next();
  };
}
