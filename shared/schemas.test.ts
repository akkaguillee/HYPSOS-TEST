import { describe, expect, it } from 'vitest';
import { contactSchema, fieldErrors, newsletterSchema } from './schemas';

describe('validación compartida', () => {
  it('normaliza el email', () => {
    expect(newsletterSchema.parse({ email: '  Drop@HYPSOS.test ', consent: true }).email).toBe('drop@hypsos.test');
  });

  it('devuelve mensajes en español por campo', () => {
    const result = contactSchema.safeParse({ name: '', email: 'x', subject: 'nada', message: 'hola', consent: false });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(errors).toMatchObject({
      name: 'El nombre es obligatorio',
      email: 'Introduce un email válido',
      subject: 'Selecciona un motivo',
      message: 'Cuéntanos un poco más (mínimo 10 caracteres)',
      consent: 'Debes aceptar la política de privacidad',
    });
  });
});
