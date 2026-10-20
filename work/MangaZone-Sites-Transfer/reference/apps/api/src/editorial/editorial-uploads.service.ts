import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EditorialUploadPurpose } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ObjectStorage } from '../storage/object-storage.port.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { CreateEditorialUploadIntentDto } from './dto/editorial-upload.dto.js';
import {
  COVER_INTENT_TTL_SECONDS,
  COVER_MAX_BYTES,
} from './editorial-upload.policy.js';
import { editorialMangaNotFound } from './editorial.errors.js';

@Injectable()
export class EditorialUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly storage: ObjectStorage,
  ) {}

  async create(actorUserId: string, dto: CreateEditorialUploadIntentDto) {
    // Signing uses explicit local credentials, not a network provider inside the DB transaction.
    await this.authorization.assertCatalogManager(actorUserId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + COVER_INTENT_TTL_SECONDS * 1000);
    const temporaryStorageKey = `tmp/editorial/${randomUUID()}`;
    const signed = await this.storage.createPresignedUpload({
      key: temporaryStorageKey,
      contentType: dto.contentType,
      expectedBytes: dto.expectedBytes,
      now,
      expiresAt,
    });
    const intent = await this.prisma.$transaction(async (tx) => {
      await this.authorization.assertCatalogManager(actorUserId, tx);
      const manga = await tx.manga.findUnique({
        where: { id: dto.mangaId },
        select: { id: true },
      });
      if (!manga) throw editorialMangaNotFound();
      return tx.editorialUploadIntent.create({
        data: {
          actorUserId,
          purpose: EditorialUploadPurpose.MANGA_COVER,
          mangaId: manga.id,
          temporaryStorageKey,
          expectedBytes: BigInt(dto.expectedBytes),
          maxBytes: BigInt(COVER_MAX_BYTES),
          expiresAt,
          createdAt: now,
        },
        select: { id: true },
      });
    });
    return {
      intentId: intent.id,
      ...signed,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
