import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ObjectStorage } from '../storage/object-storage.port.js';
import { isReadyObjectKey } from '../storage/storage-key.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { editorialNotFound } from './editorial.errors.js';
import { COVER_CONTENT_TYPES } from './editorial-upload.policy.js';

@Injectable()
export class EditorialCoverMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly storage: ObjectStorage,
  ) {}

  async resolve(mangaId: string, userId?: string): Promise<string> {
    const manga = await this.prisma.manga.findUnique({
      where: { id: mangaId },
      select: {
        editorialStatus: true,
        contentRating: true,
        coverAsset: {
          select: { status: true, storageKey: true, mimeType: true },
        },
      },
    });
    if (!manga) throw editorialNotFound();
    if (manga.editorialStatus !== 'PUBLIC' || manga.contentRating === 'ADULT') {
      if (!userId) throw editorialNotFound();
      await this.authorization.assertMangaCoverReader(userId, mangaId);
    }
    const asset = manga.coverAsset;
    if (
      !asset ||
      asset.status !== 'READY' ||
      !isReadyObjectKey(asset.storageKey) ||
      !COVER_CONTENT_TYPES.some((type) => type === asset.mimeType)
    )
      throw editorialNotFound();
    return this.storage.createPresignedDownload(asset.storageKey);
  }
}
