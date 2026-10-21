import { Hono } from 'hono';
import { getProductById, isVariantValid, variantId } from '../../shared/catalog';
import { contactSchema, emailField, fieldErrors, newsletterSchema } from '../../shared/schemas';
import { z } from 'zod';
import { readJson, scaledLimit, type AppDeps, type AppEnv } from '../context';
import { rateLimit } from '../rate-limit';

const stockAlertSchema = z.object({
  email: emailField,
  productId: z.string().min(1).max(64),
  colorId: z.string().min(1).max(32),
  size: z.string().min(1).max(16),
  consent: z.literal(true, 'Necesitamos tu consentimiento para avisarte'),
});

export function formRoutes(deps: AppDeps) {
  const { env, repos, mailer, logger } = deps;
  const app = new Hono<AppEnv>();
  const limit = rateLimit({ windowMs: 10 * 60 * 1000, max: scaledLimit(deps, 8), keyFor: deps.clientIp });

  app.post('/newsletter', limit, async (c) => {
    const parsed = newsletterSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json({ error: 'validation_error', message: 'Revisa los datos.', fields: fieldErrors(parsed.error) }, 422);
    const created = repos.newsletter.subscribe(parsed.data.email, parsed.data.source);
    return c.json({ status: created ? 'subscribed' : 'already_subscribed' }, created ? 201 : 200);
  });

  /** "Avísame": aviso de reposición de una variante agotada. */
  app.post('/stock-alerts', limit, async (c) => {
    const parsed = stockAlertSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json({ error: 'validation_error', message: 'Revisa los datos.', fields: fieldErrors(parsed.error) }, 422);
    const { email, productId, colorId, size } = parsed.data;
    const product = getProductById(productId);
    if (!product || !isVariantValid(product, colorId, size)) return c.json({ error: 'invalid_variant' }, 404);
    repos.stockAlerts.create(email, variantId(productId, colorId, size));
    return c.json({ status: 'registered' }, 201);
  });

  app.post('/contact', limit, async (c) => {
    const body = await readJson(c);
    if (body && typeof body === 'object' && 'website' in body && (body as { website?: string }).website) {
      // Honeypot relleno: respuesta neutra para no dar pistas a los bots.
      return c.json({ status: 'received' }, 201);
    }
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: 'Revisa los datos del formulario.', fields: fieldErrors(parsed.error) }, 422);
    }
    repos.contact.create(parsed.data);
    if (mailer && env.CONTACT_INBOX) {
      mailer
        .send({
          to: env.CONTACT_INBOX,
          subject: `[Contacto web] ${parsed.data.subject} — ${parsed.data.name}`,
          text: `${parsed.data.name} <${parsed.data.email}>\nPedido: ${parsed.data.orderNumber || '—'}\n\n${parsed.data.message}`,
        })
        .catch((error) => logger.error('[mail] No se pudo reenviar el mensaje de contacto', error));
    }
    return c.json({ status: 'received' }, 201);
  });

  return app;
}
