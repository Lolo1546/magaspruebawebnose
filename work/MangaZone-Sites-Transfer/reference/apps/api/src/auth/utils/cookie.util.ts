import { CookieOptions, Response } from 'express';

export function setSessionCookie(
  res: Pick<Response, 'cookie'>,
  cookieName: string,
  rawSessionToken: string,
  isProduction: boolean,
  expiresAt: Date,
  now?: Date,
): void {
  const referenceNow = now ?? new Date();

  if (expiresAt.getTime() <= referenceNow.getTime()) {
    throw new RangeError(
      'La expiración de la cookie no puede ser en el pasado o presente.',
    );
  }

  const maxAge = expiresAt.getTime() - referenceNow.getTime();

  const options: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    expires: expiresAt,
    maxAge: maxAge,
  };

  res.cookie(cookieName, rawSessionToken, options);
}

export function clearSessionCookie(
  res: Pick<Response, 'clearCookie'>,
  cookieName: string,
  isProduction: boolean,
): void {
  const options: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  };

  res.clearCookie(cookieName, options);
}
