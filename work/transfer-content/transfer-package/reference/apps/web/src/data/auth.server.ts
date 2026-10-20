import { cookies } from 'next/headers';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SessionResponse {
  user: SessionUser;
  csrfToken: string;
}

export async function getSession(): Promise<SessionResponse | null> {
  // Use Next.js cookies API
  // In Next.js 14 it might be synchronous, but in Next 15+ it's async.
  // Next 16 requires await cookies()
  const cookieStore = await cookies();
  const mzSession = cookieStore.get('mz_session');

  if (!mzSession || !mzSession.value) {
    return null;
  }

  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const response = await fetch(`${baseUrl}/auth/session`, {
    headers: {
      Cookie: `mz_session=${mzSession.value}`,
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    return null;
  }

  if (response.status === 403) {
    throw new Error('Forbidden'); // or propagate error properly
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  const data = await response.json();
  return data as SessionResponse;
}

export async function getPrivateHeaders(): Promise<HeadersInit | null> {
  const cookieStore = await cookies();
  const mzSession = cookieStore.get('mz_session');

  if (!mzSession || !mzSession.value) {
    return null;
  }

  return { Cookie: `mz_session=${mzSession.value}` };
}

