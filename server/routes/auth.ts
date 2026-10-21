import { Hono } from 'hono';
import { products } from '../../shared/catalog';
import {
  addressSchema,
  changePasswordSchema,
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  wishlistSchema,
} from '../../shared/schemas';
import {
  dummyPasswordHash,
  endSession,
  hashPassword,
  hashToken,
  newToken,
  publicUser,
  RESET_MINUTES,
  startSession,
  verifyPassword,
} from '../auth';
import { readJson, requireUser, scaledLimit, type AppDeps, type AppEnv } from '../context';
import { rateLimit } from '../rate-limit';

const invalid = (error: import('zod').ZodError) => ({
  error: 'validation_error',
  message: 'Revisa los datos del formulario.',
  fields: fieldErrors(error),
});

const knownProductIds = new Set(products.map((product) => product.id));

export function authRoutes(deps: AppDeps) {
  const { env, repos, mailer, logger } = deps;
  const secure = env.NODE_ENV === 'production';
  const app = new Hono<AppEnv>();
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: scaledLimit(deps, 10), keyFor: deps.clientIp });
  const accountLimit = rateLimit({ windowMs: 60 * 1000, max: scaledLimit(deps, 60), keyFor: deps.clientIp });

  app.get('/auth/me', (c) => {
    const user = c.get('user');
    return c.json({ user: user ? publicUser(user) : null });
  });

  app.post('/auth/register', authLimit, async (c) => {
    const parsed = registerSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const { email, name, password, marketingOptIn } = parsed.data;
    if (repos.users.findByEmail(email)) {
      return c.json({ error: 'email_taken', message: 'Ya existe una cuenta con este email. Inicia sesión.', fields: { email: 'Ya existe una cuenta con este email' } }, 409);
    }
    const user = repos.users.create({ email, name, passwordHash: await hashPassword(password), marketingOptIn });
    if (marketingOptIn) repos.newsletter.subscribe(email, 'registro');
    startSession(c, repos, user.id, secure);
    return c.json({ user: publicUser(user) }, 201);
  });

  app.post('/auth/login', authLimit, async (c) => {
    const parsed = loginSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const user = repos.users.findByEmail(parsed.data.email);
    // Se compara siempre (aunque no exista la cuenta) para no revelar qué emails están registrados.
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !valid) return c.json({ error: 'invalid_credentials', message: 'Email o contraseña incorrectos.' }, 401);
    startSession(c, repos, user.id, secure);
    return c.json({ user: publicUser(user) });
  });

  app.post('/auth/logout', (c) => {
    endSession(c, repos);
    return c.json({ status: 'ok' });
  });

  app.post('/auth/password/forgot', authLimit, async (c) => {
    if (!mailer) {
      return c.json(
        { error: 'email_not_configured', message: 'La recuperación de contraseña por email aún no está disponible. Escríbenos desde la página de contacto.' },
        503,
      );
    }
    const parsed = forgotPasswordSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const user = repos.users.findByEmail(parsed.data.email);
    if (user) {
      const token = newToken();
      repos.passwordResets.create(hashToken(token), user.id, new Date(Date.now() + RESET_MINUTES * 60_000));
      const link = `${env.PUBLIC_URL}/cuenta/restablecer?token=${encodeURIComponent(token)}`;
      try {
        await mailer.send({
          to: user.email,
          subject: 'Restablece tu contraseña de HYPSOS',
          text: `Hola ${user.name}:\n\nPara crear una nueva contraseña abre este enlace (caduca en ${RESET_MINUTES} minutos):\n${link}\n\nSi no lo has pedido tú, ignora este mensaje.`,
        });
      } catch (error) {
        logger.error('[mail] No se pudo enviar el email de recuperación', error);
        return c.json({ error: 'email_failed', message: 'No hemos podido enviar el email. Inténtalo más tarde.' }, 502);
      }
    }
    // Misma respuesta exista o no la cuenta.
    return c.json({ status: 'sent' });
  });

  app.post('/auth/password/reset', authLimit, async (c) => {
    const parsed = resetPasswordSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const userId = repos.passwordResets.consume(hashToken(parsed.data.token));
    if (!userId) return c.json({ error: 'invalid_token', message: 'El enlace no es válido o ha caducado. Solicita uno nuevo.' }, 400);
    repos.users.setPassword(userId, await hashPassword(parsed.data.password));
    repos.sessions.deleteForUser(userId); // cierra cualquier sesión abierta con la contraseña anterior
    startSession(c, repos, userId, secure);
    return c.json({ user: publicUser(repos.users.findById(userId)!) });
  });

  // ─── Área de cliente ────────────────────────────────────────────────────
  const account = new Hono<AppEnv>();
  account.use('*', requireUser, accountLimit);

  account.patch('/profile', async (c) => {
    const parsed = profileSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const user = c.get('user')!;
    repos.users.update(user.id, parsed.data);
    if (parsed.data.marketingOptIn) repos.newsletter.subscribe(user.email, 'cuenta');
    return c.json({ user: publicUser(repos.users.findById(user.id)!) });
  });

  account.post('/password', async (c) => {
    const parsed = changePasswordSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const user = c.get('user')!;
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return c.json({ error: 'invalid_credentials', message: 'La contraseña actual no es correcta.', fields: { currentPassword: 'La contraseña actual no es correcta' } }, 401);
    }
    repos.users.setPassword(user.id, await hashPassword(parsed.data.newPassword));
    repos.sessions.deleteForUser(user.id);
    startSession(c, repos, user.id, secure);
    return c.json({ status: 'ok' });
  });

  account.delete('/', async (c) => {
    const body = (await readJson(c)) as { password?: unknown } | undefined;
    const user = c.get('user')!;
    if (typeof body?.password !== 'string' || !(await verifyPassword(body.password, user.passwordHash))) {
      return c.json({ error: 'invalid_credentials', message: 'Confirma tu contraseña para eliminar la cuenta.', fields: { password: 'Contraseña incorrecta' } }, 401);
    }
    endSession(c, repos);
    repos.users.delete(user.id);
    return c.json({ status: 'deleted' });
  });

  account.get('/orders', (c) =>
    c.json({
      orders: repos.orders.listByUser(c.get('user')!.id).map((order) => ({
        number: order.number,
        status: order.status,
        createdAt: order.createdAt,
        total: order.totals.total,
        currency: order.currency,
        items: order.items.map(({ productId, name, colorName, size, quantity, unitPrice }) => ({ productId, name, colorName, size, quantity, unitPrice })),
      })),
    }),
  );

  account.get('/addresses', (c) => c.json({ addresses: repos.addresses.list(c.get('user')!.id) }));

  account.post('/addresses', async (c) => {
    const parsed = addressSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const userId = c.get('user')!.id;
    if (repos.addresses.list(userId).length >= 10) return c.json({ error: 'limit', message: 'Puedes guardar hasta 10 direcciones.' }, 409);
    return c.json({ address: repos.addresses.create(userId, parsed.data) }, 201);
  });

  account.put('/addresses/:id', async (c) => {
    const parsed = addressSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const address = repos.addresses.update(c.get('user')!.id, Number(c.req.param('id')), parsed.data);
    return address ? c.json({ address }) : c.json({ error: 'not_found' }, 404);
  });

  account.delete('/addresses/:id', (c) =>
    repos.addresses.delete(c.get('user')!.id, Number(c.req.param('id'))) ? c.json({ status: 'deleted' }) : c.json({ error: 'not_found' }, 404),
  );

  account.get('/wishlist', (c) => c.json({ productIds: repos.wishlists.list(c.get('user')!.id) }));

  account.put('/wishlist', async (c) => {
    const parsed = wishlistSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json(invalid(parsed.error), 422);
    const ids = [...new Set(parsed.data.productIds)].filter((id) => knownProductIds.has(id));
    return c.json({ productIds: repos.wishlists.replace(c.get('user')!.id, ids) });
  });

  app.route('/account', account);
  return app;
}


