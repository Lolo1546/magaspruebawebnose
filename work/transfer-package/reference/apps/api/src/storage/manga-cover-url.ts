import type { AssetStatus } from '../../generated/prisma/client.js';
import { isDemoAssetKey, isReadyObjectKey } from './storage-key.js';
import { validateHttpOrigin } from './storage.config.js';

// Demo fixtures are intentionally public files. Private object keys never become public URLs.
export function mangaCoverUrl(
  mangaId: string,
  asset: { status: AssetStatus; storageKey: string } | null,
  mediaApiOrigin?: string,
): string | null {
  if (!asset || asset.status !== 'READY') return null;
  if (isDemoAssetKey(asset.storageKey)) return asset.storageKey;
  if (!isReadyObjectKey(asset.storageKey) || !mediaApiOrigin) return null;
  const origin = validateHttpOrigin(mediaApiOrigin, false);
  return `${origin}/media/mangas/${encodeURIComponent(mangaId)}/cover`;
}
