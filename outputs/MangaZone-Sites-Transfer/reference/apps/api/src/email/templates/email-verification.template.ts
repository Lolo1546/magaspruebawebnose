export function createEmailVerificationTemplate(input: {
  verificationUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  if (
    !(input.expiresAt instanceof Date) ||
    Number.isNaN(input.expiresAt.getTime())
  ) {
    throw new Error('Invalid expiration date provided to template');
  }

  const formatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const formattedDate = `${formatter.format(input.expiresAt)} UTC`;

  // Escape básico de HTML para prevenir inyecciones en el payload dinámico (URL).
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const safeUrl = escapeHtml(input.verificationUrl);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verifica tu correo electrónico</h2>
      <p>Gracias por registrarte. Por favor, verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
      <p>
        <a href="${safeUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Verificar correo
        </a>
      </p>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p><a href="${safeUrl}">${safeUrl}</a></p>
      <p>Este enlace expirará el ${formattedDate}.</p>
      <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
    </div>
  `;

  const text = `Verifica tu correo electrónico

Gracias por registrarte. Por favor, verifica tu dirección de correo electrónico abriendo el siguiente enlace en tu navegador:

${input.verificationUrl}

Este enlace expirará el ${formattedDate}.

Si no creaste esta cuenta, puedes ignorar este correo.`;

  return {
    subject: 'Verifica tu cuenta',
    html,
    text,
  };
}
