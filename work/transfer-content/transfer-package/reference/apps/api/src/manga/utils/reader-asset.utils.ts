import {
  AssetStatus,
  ChapterReleaseStatus,
} from '../../../generated/prisma/client.js';
import { isUUID } from 'class-validator';
import { isFinalPageKey } from '../../storage/storage-key.js';
import { validateHttpOrigin } from '../../storage/storage.config.js';
import { PAGE_CONTENT_TYPES } from '../../editorial/editorial-page.policy.js';

export type ReaderMediaPolicy = {
  readonly mediaApiOrigin?: string;
  readonly objectStorageBucket?: string;
  readonly objectStorageEndpoint?: string;
};

type ReaderPageAsset = {
  readonly status: AssetStatus;
  readonly storageKey: string;
  readonly mimeType?: string;
  readonly uploadIntent?: {
    readonly purpose: string;
    readonly state: string;
    readonly releaseId: string | null;
  } | null;
};

export type ReaderPageWithAsset = {
  readonly id?: string;
  readonly chapterReleaseId?: string;
  readonly asset: ReaderPageAsset;
  readonly pageNumber: number;
};

export type ReaderReleaseWithPages = {
  readonly pages: readonly ReaderPageWithAsset[];
  readonly status: ChapterReleaseStatus;
};

export type ResolvedReaderPage<TPage extends ReaderPageWithAsset> = {
  readonly page: TPage;
  readonly url: string;
};

const demoAssetPattern =
  /^\/demo\/[a-z0-9][a-z0-9._-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const objectStorageBucketPattern = /^[a-z0-9][a-z0-9._-]*$/i;
const objectStorageSegmentPattern = /^[a-z0-9][a-z0-9._-]*$/i;

export function resolveReaderAssetUrl(
  storageKey: string,
  policy: ReaderMediaPolicy,
  page?: Pick<ReaderPageWithAsset, 'id' | 'chapterReleaseId' | 'asset'>,
): string | null {
  // Productive PAGE keys never fall back to unsigned object-storage URLs.
  if (storageKey.startsWith('media/manga-pages/')) {
    if (
      !page ||
      !isFinalPageKey(storageKey) ||
      !isUUID(page.id, '7') ||
      !isUUID(page.chapterReleaseId, '7') ||
      page.asset.status !== AssetStatus.READY ||
      !PAGE_CONTENT_TYPES.some((mime) => mime === page.asset.mimeType) ||
      page.asset.uploadIntent?.purpose !== 'MANGA_PAGE' ||
      page.asset.uploadIntent.state !== 'FINALIZED' ||
      page.asset.uploadIntent.releaseId !== page.chapterReleaseId ||
      !policy.mediaApiOrigin
    )
      return null;
    try {
      const origin = validateHttpOrigin(policy.mediaApiOrigin, false);
      return `${origin}/media/releases/${page.chapterReleaseId}/pages/${page.id}`;
    } catch {
      return null;
    }
  }
  if (demoAssetPattern.test(storageKey)) {
    return storageKey;
  }

  if (
    storageKey.startsWith('/') ||
    storageKey.includes('\\') ||
    storageKey.includes('%') ||
    storageKey.includes('//')
  ) {
    return null;
  }

  const segments = storageKey.split('/');
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !objectStorageSegmentPattern.test(segment) ||
        segment === '.' ||
        segment === '..',
    )
  ) {
    return null;
  }

  const { objectStorageBucket, objectStorageEndpoint } = policy;
  if (
    !objectStorageBucket ||
    !objectStorageBucketPattern.test(objectStorageBucket) ||
    !objectStorageEndpoint
  ) {
    return null;
  }

  let endpoint: URL;
  try {
    endpoint = new URL(objectStorageEndpoint);
  } catch {
    return null;
  }

  if (
    (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    return null;
  }

  const basePath = endpoint.pathname.replace(/\/$/, '');
  const assetPath = [objectStorageBucket, ...segments]
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  endpoint.pathname = `${basePath}/${assetPath}`;

  return endpoint.toString();
}

export function getReadableReaderPages<TPage extends ReaderPageWithAsset>(
  pages: readonly TPage[],
  policy: ReaderMediaPolicy,
): readonly ResolvedReaderPage<TPage>[] {
  return pages
    .flatMap((page) => {
      if (page.asset.status !== AssetStatus.READY) return [];

      const url = resolveReaderAssetUrl(page.asset.storageKey, policy, page);
      return url ? [{ page, url }] : [];
    })
    .sort((left, right) => left.page.pageNumber - right.page.pageNumber);
}

export function isReadableReaderRelease(
  release: ReaderReleaseWithPages,
  policy: ReaderMediaPolicy,
): boolean {
  return (
    release.status === ChapterReleaseStatus.PUBLISHED &&
    getReadableReaderPages(release.pages, policy).length > 0
  );
}
