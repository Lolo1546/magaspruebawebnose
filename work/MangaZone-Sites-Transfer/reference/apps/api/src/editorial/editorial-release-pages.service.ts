import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ObjectStorage } from '../storage/object-storage.port.js';
import { isFinalPageKey } from '../storage/storage-key.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { editorialNotFound, editorialConflict } from './editorial.errors.js';
import {
  PAGE_MAX_BYTES,
  PAGE_CONTENT_TYPES,
  PAGE_INTENT_TTL_SECONDS,
} from './editorial-page.policy.js';
import type {
  CreateEditorialPageIntentDto,
  ReorderEditorialPagesDto,
} from './dto/editorial-page.dto.js';

export type ReleasePageContext = {
  projectId: string;
  chapterId: string;
  releaseId: string;
};

@Injectable()
export class EditorialReleasePagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly storage: ObjectStorage,
  ) {}

  private async assertReadable(
    actor: string,
    releaseId: string,
    tx: Prisma.TransactionClient = this.prisma,
    context?: ReleasePageContext,
  ) {
    const scope = await this.authorization.projectReadScope(actor, tx);
    const release = await tx.chapterRelease.findFirst({
      where: {
        id: releaseId,
        project: { is: scope },
        ...(context
          ? { projectId: context.projectId, chapterId: context.chapterId }
          : {}),
      },
      select: {
        id: true,
        status: true,
        version: true,
        projectId: true,
        publishingGroupId: true,
        project: { select: { mangaId: true } },
        chapter: { select: { mangaId: true, status: true } },
      },
    });
    if (
      !release ||
      !release.projectId ||
      !release.project ||
      !release.publishingGroupId
    )
      throw editorialNotFound();
    await this.authorization.assertPublishing(
      actor,
      release.projectId,
      release.publishingGroupId,
      'view',
      tx,
    );
    if (release.chapter.mangaId !== release.project.mangaId)
      throw editorialNotFound();
    if (!['DRAFT', 'PUBLISHED', 'WITHDRAWN'].includes(release.status))
      throw editorialConflict('EDITORIAL_RELEASE_NOT_DRAFT');
    return release;
  }

  async assertWritable(
    actor: string,
    releaseId: string,
    tx: Prisma.TransactionClient = this.prisma,
    context?: ReleasePageContext,
  ) {
    const release = await this.assertReadable(actor, releaseId, tx, context);
    if (release.status !== 'DRAFT')
      throw editorialConflict('EDITORIAL_RELEASE_NOT_DRAFT');
    if (release.chapter.status !== 'ACTIVE')
      throw editorialConflict('EDITORIAL_CHAPTER_NOT_ACTIVE');
    return release;
  }

  async createIntent(
    actor: string,
    context: ReleasePageContext,
    dto: CreateEditorialPageIntentDto,
  ) {
    await this.assertWritable(actor, context.releaseId, this.prisma, context);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PAGE_INTENT_TTL_SECONDS * 1000);
    const key = `tmp/editorial/${randomUUID()}`;
    const signed = await this.storage.createPresignedUpload({
      key,
      contentType: dto.contentType,
      expectedBytes: dto.expectedBytes,
      now,
      expiresAt,
    });
    const intent = await this.prisma.$transaction(async (tx) => {
      await this.assertWritable(actor, context.releaseId, tx, context);
      return tx.editorialUploadIntent.create({
        data: {
          purpose: 'MANGA_PAGE',
          actorUserId: actor,
          releaseId: context.releaseId,
          temporaryStorageKey: key,
          expectedBytes: BigInt(dto.expectedBytes),
          maxBytes: BigInt(PAGE_MAX_BYTES),
          createdAt: now,
          expiresAt,
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

  // The caller holds its intent lock first; all page mutations then lock release.
  async append(
    tx: Prisma.TransactionClient,
    actor: string,
    releaseId: string,
    assetId: string,
  ) {
    await tx.$queryRaw`SELECT "id" FROM "ChapterRelease" WHERE "id" = ${releaseId}::uuid FOR UPDATE`;
    const release = await this.assertWritable(actor, releaseId, tx);
    const last = await tx.chapterPage.aggregate({
      where: { chapterReleaseId: releaseId },
      _max: { pageNumber: true },
    });
    const pageNumber = (last._max.pageNumber ?? 0) + 1;
    if (pageNumber > 2147483647 || release.version >= 2147483647)
      throw editorialConflict('EDITORIAL_PAGE_CAPACITY_EXCEEDED');
    const page = await tx.chapterPage.create({
      data: { chapterReleaseId: releaseId, assetId, pageNumber },
      select: { id: true, pageNumber: true },
    });
    await this.advanceVersion(tx, releaseId, release.version);
    return {
      releaseId,
      pageId: page.id,
      pageNumber: page.pageNumber,
      version: release.version + 1,
    };
  }

  private async advanceVersion(
    tx: Prisma.TransactionClient,
    releaseId: string,
    version: number,
  ) {
    const updated = await tx.chapterRelease.updateMany({
      where: { id: releaseId, status: 'DRAFT', version },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1)
      throw editorialConflict('EDITORIAL_RELEASE_STALE_VERSION');
  }

  async reorder(
    actor: string,
    context: ReleasePageContext,
    dto: ReorderEditorialPagesDto,
  ) {
    await this.assertWritable(actor, context.releaseId, this.prisma, context);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ChapterRelease" WHERE "id" = ${context.releaseId}::uuid FOR UPDATE`;
      const release = await this.assertWritable(
        actor,
        context.releaseId,
        tx,
        context,
      );
      if (release.version !== dto.expectedVersion)
        throw editorialConflict('EDITORIAL_RELEASE_STALE_VERSION');
      const pages = await tx.chapterPage.findMany({
        where: { chapterReleaseId: release.id },
        select: { id: true, pageNumber: true },
      });
      const ids = new Set(dto.pageIds);
      if (
        ids.size !== dto.pageIds.length ||
        pages.length !== ids.size ||
        pages.some((page) => !ids.has(page.id))
      )
        throw editorialConflict('EDITORIAL_PAGE_ORDER_INVALID');
      const max = pages.reduce(
        (value, page) => Math.max(value, page.pageNumber),
        0,
      );
      if (max + pages.length > 2147483647)
        throw editorialConflict('EDITORIAL_PAGE_CAPACITY_EXCEEDED');
      // Positive temporary slots above every existing position avoid immediate unique violations.
      for (let i = 0; i < dto.pageIds.length; i += 1) {
        await tx.chapterPage.update({
          where: { id: dto.pageIds[i] },
          data: { pageNumber: max + i + 1 },
        });
      }
      for (let i = 0; i < dto.pageIds.length; i += 1) {
        await tx.chapterPage.update({
          where: { id: dto.pageIds[i] },
          data: { pageNumber: i + 1 },
        });
      }
      await this.advanceVersion(tx, release.id, release.version);
      return {
        releaseId: release.id,
        version: release.version + 1,
        pages: dto.pageIds.map((id, i) => ({ id, pageNumber: i + 1 })),
      };
    });
  }

  async list(actor: string, context: ReleasePageContext) {
    return this.prisma.$transaction(async (tx) => {
      const release = await this.assertReadable(
        actor,
        context.releaseId,
        tx,
        context,
      );
      const rows = await tx.chapterPage.findMany({
        where: { chapterReleaseId: release.id, asset: { status: 'READY' } },
        orderBy: [{ pageNumber: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          pageNumber: true,
          asset: { select: { width: true, height: true, mimeType: true } },
        },
      });
      return {
        releaseId: release.id,
        version: release.version,
        pages: rows.map((page) => ({
          id: page.id,
          pageNumber: page.pageNumber,
          width: page.asset.width,
          height: page.asset.height,
          mimeType: page.asset.mimeType,
          previewUrl: `/media/editorial/releases/${release.id}/pages/${page.id}`,
        })),
      };
    });
  }

  async preview(actor: string, releaseId: string, pageId: string) {
    const key = await this.prisma.$transaction(async (tx) => {
      await this.assertReadable(actor, releaseId, tx);
      const page = await tx.chapterPage.findFirst({
        where: { id: pageId, chapterReleaseId: releaseId },
        select: {
          asset: { select: { status: true, storageKey: true, mimeType: true } },
        },
      });
      const asset = page?.asset;
      if (
        !asset ||
        asset.status !== 'READY' ||
        !isFinalPageKey(asset.storageKey) ||
        !PAGE_CONTENT_TYPES.some((type) => type === asset.mimeType)
      )
        throw editorialNotFound();
      return asset.storageKey;
    });
    return this.storage.createPresignedDownload(key);
  }
}
