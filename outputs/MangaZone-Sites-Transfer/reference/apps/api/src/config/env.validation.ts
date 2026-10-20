import {
  parseStorageConfig,
  validateHttpOrigin,
} from '../storage/storage.config.js';

function parseStrictInt(
  value: unknown,
  min: number,
  max: number,
  varName: string,
): number {
  if (value === undefined || value === null) {
    throw new Error(`Variable no definida: ${varName}`);
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${varName} debe ser un string o número.`);
  }
  const strVal = String(value).trim();
  if (strVal === '') {
    throw new Error(`${varName} no puede estar vacía.`);
  }
  const num = Number(strVal);
  if (!Number.isInteger(num)) {
    throw new Error(
      `${varName} debe ser un entero válido (recibido: ${strVal}).`,
    );
  }
  if (num < min || num > max) {
    throw new Error(`${varName} debe estar entre ${min} y ${max}.`);
  }
  return num;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const storage = parseStorageConfig(config);
  if (storage || config.MEDIA_API_ORIGIN) {
    config.MEDIA_API_ORIGIN = validateHttpOrigin(
      config.MEDIA_API_ORIGIN,
      config.NODE_ENV === 'production',
    );
  }
  if (config.NODE_ENV === 'production') {
    if (!config.DATABASE_URL) {
      throw new Error(
        'La configuración de DATABASE_URL es inválida o faltante.',
      );
    }
  }

  if (config.SESSION_MAX_AGE_DAYS !== undefined) {
    parseStrictInt(config.SESSION_MAX_AGE_DAYS, 1, 365, 'SESSION_MAX_AGE_DAYS');
  }
  if (config.SESSION_IDLE_TIMEOUT_DAYS !== undefined) {
    const idle = parseStrictInt(
      config.SESSION_IDLE_TIMEOUT_DAYS,
      1,
      90,
      'SESSION_IDLE_TIMEOUT_DAYS',
    );
    const maxAge =
      config.SESSION_MAX_AGE_DAYS !== undefined
        ? parseStrictInt(
            config.SESSION_MAX_AGE_DAYS,
            1,
            365,
            'SESSION_MAX_AGE_DAYS',
          )
        : 30;
    if (idle > maxAge) {
      throw new Error(
        'SESSION_IDLE_TIMEOUT_DAYS no puede ser mayor que SESSION_MAX_AGE_DAYS.',
      );
    }
  }
  if (config.SESSION_TOUCH_THROTTLE_MINUTES !== undefined) {
    parseStrictInt(
      config.SESSION_TOUCH_THROTTLE_MINUTES,
      1,
      60,
      'SESSION_TOUCH_THROTTLE_MINUTES',
    );
  }

  // --- PHASE 2D.1 VALIDATIONS ---

  // SESSION_COOKIE_NAME
  const sessionCookieName =
    config.SESSION_COOKIE_NAME !== undefined
      ? (config.SESSION_COOKIE_NAME as string)
      : 'mz_session';
  if (!sessionCookieName || sessionCookieName.trim() === '') {
    throw new Error('SESSION_COOKIE_NAME no puede estar vacía.');
  }
  if (
    /[\s;,]/.test(sessionCookieName) ||
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1F\x7F]/.test(sessionCookieName)
  ) {
    throw new Error(
      'SESSION_COOKIE_NAME contiene caracteres no permitidos (espacios, comas, punto y coma, o caracteres de control).',
    );
  }
  config.SESSION_COOKIE_NAME = sessionCookieName;

  // CSRF_SECRET
  const csrfSecret = config.CSRF_SECRET;
  if (csrfSecret === undefined || csrfSecret === null) {
    throw new Error('CSRF_SECRET es obligatorio.');
  }
  if (typeof csrfSecret !== 'string') {
    throw new Error('CSRF_SECRET debe ser un string.');
  }
  if (csrfSecret.trim() === '') {
    throw new Error(
      'CSRF_SECRET no puede estar vacía o contener solo espacios.',
    );
  }
  // Mínimo 32 bytes efectivos en UTF-8
  const secretBytes = Buffer.byteLength(csrfSecret, 'utf8');
  if (secretBytes < 32) {
    throw new Error(
      'CSRF_SECRET debe tener una longitud mínima de 32 bytes en UTF-8.',
    );
  }

  const passwordResetQueueEncryptionKey =
    config.PASSWORD_RESET_QUEUE_ENCRYPTION_KEY;
  const passwordResetQueueKeyBytes =
    typeof passwordResetQueueEncryptionKey === 'string'
      ? Buffer.from(passwordResetQueueEncryptionKey, 'base64url')
      : null;
  if (
    typeof passwordResetQueueEncryptionKey !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(passwordResetQueueEncryptionKey) ||
    passwordResetQueueKeyBytes?.length !== 32 ||
    passwordResetQueueKeyBytes.toString('base64url') !==
      passwordResetQueueEncryptionKey
  ) {
    throw new Error(
      'PASSWORD_RESET_QUEUE_ENCRYPTION_KEY debe ser una clave Base64URL de 32 bytes.',
    );
  }

  // CORS_ALLOWED_ORIGINS
  const corsOrigins = config.CORS_ALLOWED_ORIGINS;
  if (corsOrigins === undefined || corsOrigins === null) {
    throw new Error('CORS_ALLOWED_ORIGINS es obligatorio.');
  }
  if (typeof corsOrigins !== 'string') {
    throw new Error(
      'CORS_ALLOWED_ORIGINS debe ser un string separado por comas.',
    );
  }
  if (corsOrigins.trim() === '') {
    throw new Error('CORS_ALLOWED_ORIGINS no puede estar vacío.');
  }
  if (corsOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS no puede contener wildcard (*).');
  }
  const origins = corsOrigins.split(',').map((o) => o.trim());
  if (origins.some((o) => o === '')) {
    throw new Error('CORS_ALLOWED_ORIGINS no puede contener orígenes vacíos.');
  }
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Protocolo no permitido: ${origin}`);
      }
      if (
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      ) {
        throw new Error(
          `El origen debe ser una URL base exacta sin path, query, hash o credenciales: ${origin}`,
        );
      }
    } catch {
      throw new Error(`Origen CORS inválido: ${origin}`);
    }
  }

  // TRUST_PROXY_HOPS
  let trustProxyHops = 0;
  if (
    config.TRUST_PROXY_HOPS !== undefined &&
    (typeof config.TRUST_PROXY_HOPS === 'string' ||
      typeof config.TRUST_PROXY_HOPS === 'number') &&
    String(config.TRUST_PROXY_HOPS).trim() !== ''
  ) {
    trustProxyHops = parseStrictInt(
      config.TRUST_PROXY_HOPS,
      0,
      10,
      'TRUST_PROXY_HOPS',
    );
  }
  config.TRUST_PROXY_HOPS = trustProxyHops;

  // --- PHASE 2E RESEND VALIDATIONS ---
  const resendApiKey = config.RESEND_API_KEY;
  if (typeof resendApiKey !== 'string' || resendApiKey.trim() === '') {
    throw new Error('RESEND_API_KEY es obligatorio y no puede estar vacío.');
  }

  const resendFromEmail = config.RESEND_FROM_EMAIL;
  if (typeof resendFromEmail !== 'string' || resendFromEmail.trim() === '') {
    throw new Error('RESEND_FROM_EMAIL es obligatorio y no puede estar vacío.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(resendFromEmail)) {
    throw new Error(
      'RESEND_FROM_EMAIL debe tener un formato de correo válido.',
    );
  }

  const resendFromName = config.RESEND_FROM_NAME;
  if (typeof resendFromName !== 'string' || resendFromName.trim() === '') {
    throw new Error('RESEND_FROM_NAME es obligatorio y no puede estar vacío.');
  }
  if (resendFromName.length > 100) {
    throw new Error(
      'RESEND_FROM_NAME excede la longitud máxima permitida (100).',
    );
  }

  const appPublicUrl = config.APP_PUBLIC_URL;
  if (typeof appPublicUrl !== 'string' || appPublicUrl.trim() === '') {
    throw new Error('APP_PUBLIC_URL es obligatorio y no puede estar vacío.');
  }
  try {
    const url = new URL(appPublicUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(
        `APP_PUBLIC_URL tiene un protocolo no permitido: ${url.protocol}`,
      );
    }
    const nodeEnv = config.NODE_ENV;
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
      throw new Error('APP_PUBLIC_URL debe usar HTTPS en producción.');
    }
    if (
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error(
        `APP_PUBLIC_URL debe ser una URL base exacta sin path, query, hash o credenciales: ${appPublicUrl}`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('APP_PUBLIC_URL')) {
      throw err;
    }
    throw new Error('APP_PUBLIC_URL es inválida.');
  }

  // --- AUTH RATE LIMITING VALIDATIONS ---
  const envForRateLimit = config.NODE_ENV || 'development';
  let authRateLimitEnabled = false;

  const rawEnabled = config.AUTH_RATE_LIMIT_ENABLED;
  if (rawEnabled !== undefined) {
    if (
      typeof rawEnabled !== 'string' &&
      typeof rawEnabled !== 'boolean' &&
      typeof rawEnabled !== 'number'
    ) {
      throw new Error('AUTH_RATE_LIMIT_ENABLED debe ser "true" o "false".');
    }
    const strEnabled = String(rawEnabled).trim();
    if (strEnabled === 'true') {
      authRateLimitEnabled = true;
    } else if (strEnabled === 'false') {
      authRateLimitEnabled = false;
    } else {
      throw new Error('AUTH_RATE_LIMIT_ENABLED debe ser "true" o "false".');
    }
  } else {
    if (
      envForRateLimit === 'production' ||
      (envForRateLimit !== 'development' && envForRateLimit !== 'test')
    ) {
      throw new Error(
        'AUTH_RATE_LIMIT_ENABLED es obligatorio en este entorno.',
      );
    }
  }
  config.AUTH_RATE_LIMIT_ENABLED = authRateLimitEnabled;

  const rawPepper = config.AUTH_RATE_LIMIT_PEPPER;
  let authRateLimitPepper: string | null = null;

  if (rawPepper !== undefined && rawPepper !== null) {
    if (typeof rawPepper !== 'string') {
      throw new Error('AUTH_RATE_LIMIT_PEPPER debe ser un string.');
    }
    if (rawPepper.trim().length < 32) {
      throw new Error(
        'AUTH_RATE_LIMIT_PEPPER debe tener al menos 32 caracteres excluyendo espacios en blanco.',
      );
    }
    authRateLimitPepper = rawPepper; // conservar exacto sin mutar
  } else {
    if (authRateLimitEnabled) {
      throw new Error(
        'AUTH_RATE_LIMIT_PEPPER es obligatorio cuando el rate limit está habilitado.',
      );
    }
  }
  config.AUTH_RATE_LIMIT_PEPPER = authRateLimitPepper;

  return config;
}
