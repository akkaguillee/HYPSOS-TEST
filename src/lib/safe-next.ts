import { paths } from '@shared/routes';

/** Solo se permite volver a rutas internas tras iniciar sesión (evita redirecciones abiertas). */
export function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : paths.account;
}
