export function isSafeObjectKey(key: string): boolean {
  return (
    key.length <= 1024 &&
    key.split('/').every((part) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part))
  );
}

export function isEditorialTemporaryKey(key: string): boolean {
  return /^tmp\/editorial\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    key,
  );
}

export function isFinalCoverKey(key: string): boolean {
  return /^media\/manga-covers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    key,
  );
}

export function isReadyObjectKey(key: string): boolean {
  return isSafeObjectKey(key) && !/^tmp(?:\/|$)/i.test(key);
}

export function isFinalPageKey(key: string): boolean {
  return /^media\/manga-pages\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    key,
  );
}

export function isFinalThumbnailKey(key: string): boolean {
  return /^media\/chapter-thumbnails\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    key,
  );
}

export function isDemoAssetKey(key: string): boolean {
  return /^\/demo\/[a-z0-9][a-z0-9._-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(
    key,
  );
}
