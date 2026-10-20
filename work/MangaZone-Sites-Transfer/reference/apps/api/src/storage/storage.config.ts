export type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

// An entirely absent configuration disables signing; partial configuration fails closed.
export function parseStorageConfig(
  env: Record<string, unknown>,
): ObjectStorageConfig | null {
  const keys = [
    'OBJECT_STORAGE_ENDPOINT',
    'OBJECT_STORAGE_REGION',
    'OBJECT_STORAGE_BUCKET',
    'OBJECT_STORAGE_ACCESS_KEY',
    'OBJECT_STORAGE_SECRET_KEY',
  ] as const;
  if (keys.every((key) => env[key] === undefined || env[key] === '')) {
    if (env.OBJECT_STORAGE_FORCE_PATH_STYLE)
      throw new Error('Object storage configuration is incomplete.');
    return null;
  }
  const values = keys.map((key) => {
    const value = env[key];
    if (typeof value !== 'string' || !value.trim() || value !== value.trim())
      throw new Error(`Invalid object storage configuration: ${key}.`);
    return value;
  });
  const [endpoint, region, bucket, accessKeyId, secretAccessKey] = values;
  const canonicalEndpoint = validateHttpOrigin(
    endpoint,
    env.NODE_ENV === 'production',
  );
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
    bucket.includes('..')
  )
    throw new Error('Invalid OBJECT_STORAGE_BUCKET.');
  if (!/^[a-z0-9-]+$/.test(region))
    throw new Error('Invalid OBJECT_STORAGE_REGION.');
  const pathStyle =
    env.OBJECT_STORAGE_FORCE_PATH_STYLE === ''
      ? 'true'
      : (env.OBJECT_STORAGE_FORCE_PATH_STYLE ?? 'true');
  if (pathStyle !== 'true' && pathStyle !== 'false')
    throw new Error('OBJECT_STORAGE_FORCE_PATH_STYLE must be true or false.');
  return {
    endpoint: canonicalEndpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: pathStyle === 'true',
  };
}

export function validateHttpOrigin(
  value: unknown,
  production: boolean,
): string {
  try {
    if (
      typeof value !== 'string' ||
      !/^https?:\/\/[^/\\\s?#]+\/?$/i.test(value)
    )
      throw new Error();
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error();
    return url.origin;
  } catch {
    // Never include the supplied URL: it may contain credentials.
    throw new Error(
      'Storage/media endpoint must be a valid HTTP(S) origin (HTTPS in production).',
    );
  }
}
