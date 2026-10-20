import { Metadata } from 'next';
import { VerifyEmailClient } from './VerifyEmailClient';

export const metadata: Metadata = {
  title: 'Verificar correo electrónico | MangaZone',
  description: 'Verifica tu correo electrónico para activar tu cuenta.',
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

export default function VerifyEmailPage() {
  const apiBaseUrl = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  return (
    <main style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <VerifyEmailClient apiBaseUrl={apiBaseUrl} />
    </main>
  );
}
