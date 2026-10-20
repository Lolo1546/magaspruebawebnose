import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { EditorialUploadIntent } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ObjectStorage } from '../storage/object-storage.port.js';
import {
  StorageObjectError,
  StorageObjectAlreadyExistsError,
} from '../storage/storage-object.errors.js';
import { isEditorialTemporaryKey } from '../storage/storage-key.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { COVER_MAX_BYTES } from './editorial-upload.policy.js';
import { validateCover } from './editorial-cover-validation.js';
import { finalizeError } from './editorial-finalize.errors.js';
import { PAGE_MAX_BYTES, PAGE_MAX_PIXELS } from './editorial-page.policy.js';
import { validateEditorialImage } from './editorial-image-validation.js';
import { EditorialReleasePagesService } from './editorial-release-pages.service.js';
import { EditorialThumbnailsService } from './editorial-thumbnails.service.js';
import {
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_MAX_PIXELS,
} from './editorial-thumbnail.policy.js';

@Injectable()
export class EditorialFinalizeService {
  private readonly logger = new Logger(EditorialFinalizeService.name);
  private active = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly storage: ObjectStorage,
    private readonly pages: EditorialReleasePagesService,
    private readonly thumbnails: EditorialThumbnailsService,
  ) {}

  private check(
    intent: EditorialUploadIntent | null,
    actor: string,
    now: Date,
  ) {
    if (!intent || intent.actorUserId !== actor)
      throw finalizeError('UPLOAD_INTENT_NOT_FOUND', 404);
    if (intent.state !== 'PENDING' || intent.finalizedAt || intent.assetId)
      throw finalizeError('UPLOAD_INTENT_NOT_PENDING');
    if (intent.expiresAt <= now) throw finalizeError('UPLOAD_INTENT_EXPIRED');
    const cover = intent.purpose === 'MANGA_COVER';
    const thumbnail = intent.purpose === 'CHAPTER_THUMBNAIL';
    const maxBytes = thumbnail
      ? THUMBNAIL_MAX_BYTES
      : cover
        ? COVER_MAX_BYTES
        : PAGE_MAX_BYTES;
    if (
      (!cover && !thumbnail && intent.purpose !== 'MANGA_PAGE') ||
      (thumbnail
        ? !intent.chapterId || !!intent.mangaId || !!intent.releaseId
        : !!intent.chapterId ||
          !!intent.thumbnailGroupId ||
          (cover
            ? !intent.mangaId || !!intent.releaseId
            : !intent.releaseId || !!intent.mangaId)) ||
      !isEditorialTemporaryKey(intent.temporaryStorageKey) ||
      intent.maxBytes !== BigInt(maxBytes) ||
      intent.expectedBytes <= 0n ||
      intent.expectedBytes > BigInt(maxBytes)
    )
      throw finalizeError('UPLOAD_CONTEXT_INVALID');
    return intent;
  }

  async finalize(actor: string, intentId: string) {
    const stored = await this.prisma.editorialUploadIntent.findUnique({
      where: { id: intentId },
    });
    if (!stored) throw finalizeError('UPLOAD_INTENT_NOT_FOUND', 404);
    if (stored.purpose === 'MANGA_COVER')
      await this.authorization.assertCatalogManager(actor);
    const intent = this.check(stored, actor, new Date());
    if (intent.chapterId)
      await this.thumbnails.assertUpload(
        actor,
        intent.chapterId,
        intent.thumbnailGroupId,
      );
    if (intent.releaseId)
      await this.pages.assertWritable(actor, intent.releaseId);
    // Bound aggregate decode/buffer pressure per API process; never queue unbounded uploads.
    if (this.active >= 2) throw finalizeError('UPLOAD_FINALIZE_BUSY', 503);
    this.active += 1;
    try {
      return await this.complete(actor, intent);
    } finally {
      this.active -= 1;
    }
  }

  private async complete(actor: string, intent: EditorialUploadIntent) {
    const cover = intent.purpose === 'MANGA_COVER';
    const thumbnail = intent.purpose === 'CHAPTER_THUMBNAIL';
    const maxBytes = thumbnail
      ? THUMBNAIL_MAX_BYTES
      : cover
        ? COVER_MAX_BYTES
        : PAGE_MAX_BYTES;
    let object: { bytes: Buffer; contentType: string };
    try {
      object = await this.storage.readTemporary(
        intent.temporaryStorageKey,
        maxBytes,
      );
    } catch (error) {
      if (error instanceof StorageObjectError) {
        const codes = {
          MISSING: 'UPLOAD_OBJECT_NOT_FOUND',
          TOO_LARGE: 'UPLOAD_TOO_LARGE',
          SIZE_MISMATCH: 'UPLOAD_SIZE_MISMATCH',
        };
        throw finalizeError(
          codes[error.code],
          error.code === 'MISSING' ? 404 : 400,
        );
      }
      throw finalizeError('STORAGE_UNAVAILABLE', 503);
    }
    const image = cover
      ? await validateCover(
          object.bytes,
          object.contentType,
          intent.expectedBytes,
        )
      : await validateEditorialImage(
          object.bytes,
          object.contentType,
          intent.expectedBytes,
          {
            maxBytes,
            maxPixels: thumbnail ? THUMBNAIL_MAX_PIXELS : PAGE_MAX_PIXELS,
          },
        );
    const finalKey = `media/${thumbnail ? 'chapter-thumbnails' : cover ? 'manga-covers' : 'manga-pages'}/${randomUUID()}`;
    try {
      // Upload the SAME validated bytes. A replayed temporary PUT cannot alter them.
      await this.storage.putFinal(finalKey, object.bytes, image.mimeType);
    } catch (error) {
      if (error instanceof StorageObjectAlreadyExistsError)
        throw finalizeError('UPLOAD_FINAL_KEY_CONFLICT');
      // Ambiguous PUT failure: do not delete a key we cannot prove we created.
      this.logger.warn('EDITORIAL_FINAL_WRITE_FAILED_RECONCILIATION_REQUIRED');
      throw finalizeError('STORAGE_UNAVAILABLE', 503);
    }
    let result: {
      intentId: string;
      assetId: string;
      mangaId?: string;
      releaseId?: string;
      chapterId?: string;
      pageId?: string;
      pageNumber?: number;
      version?: number;
      finalizedAt: string;
    };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "EditorialUploadIntent" WHERE "id" = ${intent.id}::uuid FOR UPDATE`;
        if (cover) await this.authorization.assertCatalogManager(actor, tx);
        const now = new Date();
        const current = this.check(
          await tx.editorialUploadIntent.findUnique({
            where: { id: intent.id },
          }),
          actor,
          now,
        );
        if (
          current.mangaId !== intent.mangaId ||
          current.releaseId !== intent.releaseId ||
          current.chapterId !== intent.chapterId ||
          current.thumbnailGroupId !== intent.thumbnailGroupId ||
          current.purpose !== intent.purpose ||
          current.temporaryStorageKey !== intent.temporaryStorageKey ||
          current.expectedBytes !== intent.expectedBytes
        )
          throw finalizeError('UPLOAD_CONTEXT_INVALID');
        if (current.chapterId)
          await this.thumbnails.assertUpload(
            actor,
            current.chapterId,
            current.thumbnailGroupId,
            tx,
          );
        const manga = cover
          ? await tx.manga.findUnique({
              where: { id: current.mangaId! },
              select: { id: true },
            })
          : null;
        if (cover && !manga) throw finalizeError('UPLOAD_CONTEXT_INVALID');
        const asset = await tx.asset.create({
          data: {
            ...image,
            storageKey: finalKey,
            sizeBytes: BigInt(object.bytes.length),
            status: 'READY',
            ownerUserId: actor,
          },
          select: { id: true },
        });
        const changed = await tx.editorialUploadIntent.updateMany({
          where: {
            id: current.id,
            state: 'PENDING',
            expiresAt: { gt: now },
            assetId: null,
            finalizedAt: null,
          },
          data: { state: 'FINALIZED', finalizedAt: now, assetId: asset.id },
        });
        if (changed.count !== 1)
          throw finalizeError('UPLOAD_FINALIZE_CONFLICT');
        const association = current.releaseId
          ? await this.pages.append(tx, actor, current.releaseId, asset.id)
          : current.chapterId
            ? { chapterId: current.chapterId }
            : { mangaId: manga!.id };
        if (manga)
          await tx.manga.update({
            where: { id: manga.id },
            data: { coverAssetId: asset.id, version: { increment: 1 } },
          });
        return {
          intentId: current.id,
          assetId: asset.id,
          ...association,
          finalizedAt: now.toISOString(),
        };
      });
    } catch (error) {
      // A lost commit acknowledgement is not proof of rollback. Never delete referenced bytes.
      try {
        const referenced = await this.prisma.$transaction(async (tx) => {
          // Wait for an uncertain original transaction to release its lock before deciding.
          await tx.$queryRaw`SELECT "id" FROM "EditorialUploadIntent" WHERE "id" = ${intent.id}::uuid FOR UPDATE`;
          return tx.asset.findUnique({
            where: { storageKey: finalKey },
            select: { id: true },
          });
        });
        if (!referenced)
          await this.cleanup(finalKey, 'COVER_FINAL_CLEANUP_FAILED');
      } catch {
        this.logger.warn(
          'COVER_COMMIT_OUTCOME_UNKNOWN_RECONCILIATION_REQUIRED',
        );
      }
      throw error;
    }
    await this.cleanup(intent.temporaryStorageKey, 'COVER_TEMP_CLEANUP_FAILED');
    return result;
  }

  private async cleanup(key: string, event: string) {
    try {
      await this.storage.deleteObject(key);
    } catch {
      this.logger.warn(event);
    }
  }
}
