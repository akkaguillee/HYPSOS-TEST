import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(8787),
  PUBLIC_URL: z.url().default('http://localhost:5173'),
  DATABASE_PATH: z.string().default('./data/hypsos.db'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  /** Envío de emails con Resend (https://resend.com). Sin clave no se envían emails en producción. */
  RESEND_API_KEY: z.string().optional().default(''),
  /** Remitente verificado en el proveedor, p. ej. "HYPSOS <pedidos@tu-dominio.com>". */
  MAIL_FROM: z.string().optional().default(''),
  /** Buzón que recibe una copia de los mensajes del formulario de contacto. */
  CONTACT_INBOX: z.string().optional().default(''),
  /** Analítica (solo tras consentimiento): dominio de Plausible o ID de medición de GA4. */
  PLAUSIBLE_DOMAIN: z.string().optional().default(''),
  GA4_MEASUREMENT_ID: z.string().optional().default(''),
  /** Confiar en X-Forwarded-For (solo detrás de un proxy propio: Nginx, Render, Fly…). */
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Configuración de entorno no válida:\n${details}`);
  }
  return parsed.data;
}
