import type { Context, MiddlewareHandler } from 'hono';
import type { ShippingMethod } from '../shared/types';
import type { Repositories, UserRecord } from './db';
import type { Env } from './env';
import type { Mailer } from './mailer';
import type { PaymentProvider } from './payments';

export interface AppDeps {
  env: Env;
  repos: Repositories;
  /** `null` cuando las credenciales de pago no están configuradas. */
  payments: PaymentProvider | null;
  /** `null` cuando no hay proveedor de email. */
  mailer: Mailer | null;
  /** Métodos de envío (por defecto, los de shared/config.ts). */
  shippingMethods: ShippingMethod[];
  /** Obtiene la IP del cliente (inyectable para tests). */
  clientIp: (c: Context) => string;
  logger: Pick<Console, 'info' | 'warn' | 'error'>;
}

export type AppEnv = { Variables: { user: UserRecord | undefined } };

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

/** Exige sesión iniciada en las rutas de cuenta. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'unauthorized', message: 'Inicia sesión para continuar.' }, 401);
  await next();
};
