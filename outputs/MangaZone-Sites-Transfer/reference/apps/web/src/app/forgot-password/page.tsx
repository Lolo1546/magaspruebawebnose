import { Metadata } from 'next';
import { ForgotPasswordClient } from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Recuperar Contraseña | MangaZone',
  description: 'Solicita un enlace para restablecer tu contraseña en MangaZone.',
};

function resolveApiBaseUrl(value: string | undefined): string | null {
  if (!value || value.trim() === '') {
    return null;
  }

  const normalized = value.trim();

  try {
    const url = new URL(normalized);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    if (url.hash) {
      return null;
    }

    return normalized.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export default function ForgotPasswordPage() {
  const apiBaseUrl = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  return (
    <main style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <ForgotPasswordClient apiBaseUrl={apiBaseUrl} />
    </main>
  );
}
