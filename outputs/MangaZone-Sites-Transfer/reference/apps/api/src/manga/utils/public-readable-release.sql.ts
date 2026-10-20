import { Prisma } from '../../../generated/prisma/client.js';
import { PAGE_CONTENT_TYPES } from '../../editorial/editorial-page.policy.js';
import { validateHttpOrigin } from '../../storage/storage.config.js';
import type { ReaderMediaPolicy } from './reader-asset.utils.js';

// SQL equivalent of the reader's addressable READY-page families. This is
// applied before count/offset pagination so an unreadable release cannot make
// a chapter or its public thumbnail appear in the index.
export function publicReadableReleaseSql(
  policy: ReaderMediaPolicy,
): Prisma.Sql {
  let signedPageMedia = false;
  try {
    signedPageMedia =
      !!policy.mediaApiOrigin &&
      !!validateHttpOrigin(policy.mediaApiOrigin, false);
  } catch {
    signedPageMedia = false;
  }

  let objectMedia = false;
  try {
    const endpoint = new URL(policy.objectStorageEndpoint ?? '');
    objectMedia =
      !!policy.objectStorageBucket &&
      /^[a-z0-9][a-z0-9._-]*$/i.test(policy.objectStorageBucket) &&
      ['http:', 'https:'].includes(endpoint.protocol) &&
      !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash;
  } catch {
    objectMedia = false;
  }

  const readablePage = Prisma.sql`EXISTS (
    SELECT 1 FROM "ChapterPage" p JOIN "Asset" a ON a."id" = p."assetId"
    WHERE p."chapterReleaseId" = r."id" AND a."status" = 'READY'
    AND (
      a."storageKey" ~* '^/demo/[a-z0-9][a-z0-9._-]*\\.(avif|gif|jpe?g|png|svg|webp)$'
      ${
        signedPageMedia
          ? Prisma.sql`OR (
        a."storageKey" ~ '^media/manga-pages/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND p."id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND r."id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND a."mimeType" IN (${Prisma.join([...PAGE_CONTENT_TYPES])})
        AND EXISTS (
          SELECT 1 FROM "EditorialUploadIntent" i
          WHERE i."assetId" = a."id" AND i."releaseId" = r."id"
          AND i."purpose" = 'MANGA_PAGE' AND i."state" = 'FINALIZED'
        )
      )`
          : Prisma.empty
      }
      ${
        objectMedia
          ? Prisma.sql`OR (
        a."storageKey" ~* '^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*$'
        AND a."storageKey" !~ '(^|/)\\.{1,2}(/|$)'
        AND a."storageKey" NOT LIKE 'media/manga-pages/%'
      )`
          : Prisma.empty
      }
    )
  )`;
  return Prisma.sql`r."status" = 'PUBLISHED' AND ${readablePage}`;
}
