import { editorialConflict } from './editorial.errors.js';
import { isFinalPageKey } from '../storage/storage-key.js';
import {
  PAGE_CONTENT_TYPES,
  PAGE_MAX_BYTES,
  PAGE_MAX_PIXELS,
} from './editorial-page.policy.js';
import { EditorialLanguageConstraint } from './dto/editorial-chapter.dto.js';

type PublishPage = {
  pageNumber: number;
  assetId: string;
  asset: {
    status: string;
    storageKey: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    sizeBytes: bigint;
    uploadIntent: {
      releaseId: string | null;
      purpose: string;
      state: string;
    } | null;
  };
};

export function assertReleasePublishable(
  releaseId: string,
  language: string,
  pages: readonly PublishPage[],
): void {
  if (!new EditorialLanguageConstraint().validate(language.trim()))
    throw editorialConflict('EDITORIAL_RELEASE_LANGUAGE_INVALID');
  if (!pages.length) throw editorialConflict('EDITORIAL_RELEASE_NO_PAGES');
  const assets = new Set<string>();
  for (const [index, page] of pages.entries()) {
    const asset = page.asset;
    if (
      page.pageNumber !== index + 1 ||
      assets.has(page.assetId) ||
      asset.status !== 'READY' ||
      !isFinalPageKey(asset.storageKey) ||
      !PAGE_CONTENT_TYPES.some((mime) => mime === asset.mimeType) ||
      !asset.width ||
      !asset.height ||
      asset.width < 1 ||
      asset.height < 1 ||
      asset.width * asset.height > PAGE_MAX_PIXELS ||
      asset.sizeBytes < 1n ||
      asset.sizeBytes > BigInt(PAGE_MAX_BYTES) ||
      asset.uploadIntent?.releaseId !== releaseId ||
      asset.uploadIntent.purpose !== 'MANGA_PAGE' ||
      asset.uploadIntent.state !== 'FINALIZED'
    )
      throw editorialConflict('EDITORIAL_RELEASE_PAGES_NOT_READY');
    assets.add(page.assetId);
  }
}
