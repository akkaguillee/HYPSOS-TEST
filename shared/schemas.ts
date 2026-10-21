import { z } from 'zod';
import { store } from './config';

/** Esquemas de validación compartidos: el cliente los usa para los formularios y la API para validar. */

const countryCodes = store.shippingCountries.map((country) => country.code) as [string, ...string[]];

export const emailField = z
  .string('Introduce tu email')
  .trim()
  .toLowerCase()
  .min(1, 'Introduce tu email')
  .max(254, 'El email es demasiado largo')
  .pipe(z.email('Introduce un email válido'));

const requiredText = (label: string, max = 120) =>
  z
    .string(`${label} es obligatorio`)
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} es demasiado largo`);

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  colorId: z.string().min(1).max(32),
  size: z.string().min(1).max(16),
  quantity: z.number().int().min(1).max(store.maxQuantityPerLine),
});

export const shippingAddressSchema = z.object({
  firstName: requiredText('El nombre', 60),
  lastName: requiredText('Los apellidos', 80),
  address1: requiredText('La dirección', 120),
  address2: z.string().trim().max(120, 'Demasiado largo').optional().default(''),
  postalCode: z
    .string('El código postal es obligatorio')
    .trim()
    .min(1, 'El código postal es obligatorio')
    .regex(/^[A-Za-z0-9 -]{3,10}$/, 'Introduce un código postal válido'),
  city: requiredText('La ciudad', 80),
  province: requiredText('La provincia', 80),
  country: z.enum(countryCodes, 'Selecciona un país'),
  phone: z
    .string('El teléfono es obligatorio')
    .trim()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^\+?[0-9 ()-]{7,20}$/, 'Introduce un teléfono válido'),
});

export const checkoutRequestSchema = z.object({
  email: emailField,
  marketingOptIn: z.boolean().optional().default(false),
  shippingAddress: shippingAddressSchema,
  shippingMethod: z.enum(['standard', 'express'], 'Selecciona un método de envío'),
  acceptTerms: z.literal(true, 'Debes aceptar las condiciones de compra'),
  lines: z.array(cartLineSchema).min(1, 'El carrito está vacío').max(50),
});

export const newsletterSchema = z.object({
  email: emailField,
  consent: z.literal(true, 'Necesitamos tu consentimiento para enviarte emails'),
  source: z.string().max(40).optional(),
});

export const contactSchema = z.object({
  name: requiredText('El nombre', 80),
  email: emailField,
  subject: z.enum(['pedido', 'devolucion', 'producto', 'colaboracion', 'otro'], 'Selecciona un motivo'),
  orderNumber: z.string().trim().max(32, 'Número de pedido demasiado largo').optional().default(''),
  message: z
    .string('Escribe tu mensaje')
    .trim()
    .min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)')
    .max(3000, 'El mensaje es demasiado largo (máximo 3000 caracteres)'),
  consent: z.literal(true, 'Debes aceptar la política de privacidad'),
  /** Campo trampa anti-spam: los humanos lo dejan vacío. */
  website: z.string().max(0).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutFormInput = z.input<typeof checkoutRequestSchema>;
export type NewsletterRequest = z.infer<typeof newsletterSchema>;
export type ContactRequest = z.infer<typeof contactSchema>;
export type ContactSubject = ContactRequest['subject'];

/** Convierte los errores de zod en un mapa `ruta → mensaje` (primer error por campo). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!(path in errors)) errors[path] = issue.message;
  }
  return errors;
}
