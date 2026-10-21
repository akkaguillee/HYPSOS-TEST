/**
 * Envío de emails transaccionales desacoplado del proveedor.
 * - Con RESEND_API_KEY y MAIL_FROM: envío real mediante la API de Resend.
 * - En desarrollo sin proveedor: se escribe en la consola (para probar flujos como la recuperación de contraseña).
 * - En producción sin proveedor: `null` → las funciones que dependen del email lo indican al usuario.
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  readonly kind: 'resend' | 'console';
  send(mail: Mail): Promise<void>;
}

export function createResendMailer(apiKey: string, from: string): Mailer {
  return {
    kind: 'resend',
    async send(mail) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
      });
      if (!response.ok) throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
    },
  };
}

export function createConsoleMailer(log: (message: string) => void = console.info): Mailer {
  return {
    kind: 'console',
    async send(mail) {
      log(`[mail:dev] Para: ${mail.to}\n  Asunto: ${mail.subject}\n  ${mail.text.replace(/\n/g, '\n  ')}`);
    },
  };
}
