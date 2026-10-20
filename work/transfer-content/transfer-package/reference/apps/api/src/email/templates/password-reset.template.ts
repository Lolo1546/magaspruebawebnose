export function createPasswordResetTemplate(input: {
  resetUrl: string;
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

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const safeUrl = escapeHtml(input.resetUrl);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Restablecimiento de contrase\u00f1a</h2>
      <p>Hemos recibido una solicitud para restablecer tu contrase\u00f1a. Por favor, haz clic en el siguiente enlace para continuar:</p>
      <p>
        <a href="${safeUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Restablecer contrase\u00f1a
        </a>
      </p>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p><a href="${safeUrl}">${safeUrl}</a></p>
      <p>Este enlace expirar\u00e1 el ${formattedDate}.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo y tu cuenta seguir\u00e1 siendo segura.</p>
    </div>
  `;

  const text = `Restablecimiento de contrase\u00f1a

Hemos recibido una solicitud para restablecer tu contrase\u00f1a. Por favor, abre el siguiente enlace en tu navegador:

${input.resetUrl}

Este enlace expirar\u00e1 el ${formattedDate}.

Si no solicitaste este cambio, puedes ignorar este correo y tu cuenta seguir\u00e1 siendo segura.`;

  return {
    subject: 'Restablecimiento de contrase\u00f1a',
    html,
    text,
  };
}
