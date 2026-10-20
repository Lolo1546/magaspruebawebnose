import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ObjectStorage } from '../storage/object-storage.port.js';
import { isFinalPageKey } from '../storage/storage-key.js';
import { editorialNotFound } from './editorial.errors.js';
import { PAGE_CONTENT_TYPES } from './editorial-page.policy.js';
import { finalizeError } from './editorial-finalize.errors.js';

@Injectable()
export class PublishedPageMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async resolve(releaseId: string, pageId: string) {
    const page = await this.prisma.chapterPage.findFirst({
      where: {
        id: pageId,
        chapterReleaseId: releaseId,
        chapterRelease: {
          status: 'PUBLISHED',
          chapter: {
            status: 'ACTIVE',
            manga: {
              editorialStatus: 'PUBLIC',
              contentRating: { not: 'ADULT' },
            },
          },
        },
        asset: {
          status: 'READY',
          uploadIntent: {
            is: { releaseId, purpose: 'MANGA_PAGE', state: 'FINALIZED' },
          },
        },
      },
      select: { asset: { select: { storageKey: true, mimeType: true } } },
    });
    if (
      !page ||
      !isFinalPageKey(page.asset.storageKey) ||
      !PAGE_CONTENT_TYPES.some((mime) => mime === page.asset.mimeType)
    )
      throw editorialNotFound();
    try {
      return await this.storage.createPresignedDownload(page.asset.storageKey);
    } catch {
      throw finalizeError('STORAGE_UNAVAILABLE', 503);
    }
  }
}
