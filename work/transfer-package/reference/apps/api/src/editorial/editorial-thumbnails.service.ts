import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ObjectStorage } from '../storage/object-storage.port.js';
import { isFinalThumbnailKey } from '../storage/storage-key.js';
import { publicReadableReleaseSql } from '../manga/utils/public-readable-release.sql.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { EditorialAuditWriter } from './editorial-audit.writer.js';
import { editorialConflict, editorialNotFound } from './editorial.errors.js';
import { insufficientPermission } from '../authorization/authorization.errors.js';
import {
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_MAX_PIXELS,
  THUMBNAIL_CONTENT_TYPES,
  thumbnailWindows,
  type ThumbnailEntry,
} from './editorial-thumbnail.policy.js';
import type {
  ThumbnailIntentDto,
  SetThumbnailDto,
  RequestThumbnailDto,
} from './dto/editorial-thumbnail.dto.js';

@Injectable()
export class EditorialThumbnailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly storage: ObjectStorage,
    private readonly audit: EditorialAuditWriter,
    private readonly config: ConfigService,
  ) {}

  private async lock(tx: Prisma.TransactionClient, chapterId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Chapter" WHERE "id" = ${chapterId}::uuid FOR UPDATE`;
    // Protect current publication eligibility against withdrawal/replacement.
    // Same UUID ordering as publication; publication never takes a Chapter lock.
    await tx.$queryRaw`SELECT "id" FROM "ChapterRelease"
      WHERE "chapterId" = ${chapterId}::uuid ORDER BY "id" FOR SHARE`;
  }

  private async context(
    tx: Prisma.TransactionClient,
    actor: string,
    chapterId: string,
  ) {
    const scope = await this.authorization.projectReadScope(actor, tx);
    const user = await tx.user.findUniqueOrThrow({
      where: { id: actor },
      select: { roles: { select: { role: { select: { key: true } } } } },
    });
    const admin = user.roles.some(({ role }) => role.key === 'ADMIN');
    const chapter = await tx.chapter.findFirst({
      where: {
        id: chapterId,
        ...(admin ? {} : { manga: { projects: { some: scope } } }),
      },
      select: {
        id: true,
        mangaId: true,
        status: true,
        thumbnailAssetId: true,
        thumbnailActorUserId: true,
        thumbnailGroupId: true,
        thumbnailSetAt: true,
        manga: { select: { contentRating: true } },
      },
    });
    if (!chapter) throw editorialNotFound();
    const releases = await tx.chapterRelease.findMany({
      where: {
        chapterId,
        publishedAt: { not: null },
        publishingGroupId: { not: null },
        project: { mangaId: chapter.mangaId },
      },
      select: {
        publishedAt: true,
        publishingGroupId: true,
        status: true,
        publishingGroup: { select: { status: true } },
        project: {
          select: {
            status: true,
            groups: { select: { groupId: true, status: true, leftAt: true } },
          },
        },
      },
    });
    const entries = new Map<string, ThumbnailEntry>();
    for (const release of releases) {
      if (!release.publishingGroupId || !release.publishedAt) continue;
      const id = release.publishingGroupId;
      const eligible =
        release.status === 'PUBLISHED' &&
        release.project?.status === 'ACTIVE' &&
        release.publishingGroup?.status === 'VERIFIED' &&
        chapter.status === 'ACTIVE' &&
        chapter.manga.contentRating !== 'ADULT' &&
        release.project.groups.some(
          (g) => g.groupId === id && g.status === 'ACTIVE' && g.leftAt === null,
        );
      const previous = entries.get(id);
      entries.set(id, {
        groupId: id,
        firstPublishedAt:
          previous && previous.firstPublishedAt < release.publishedAt
            ? previous.firstPublishedAt
            : release.publishedAt,
        currentlyEligible: !!previous?.currentlyEligible || eligible,
      });
    }
    const memberships = await tx.scanlationGroupMember.findMany({
      where: {
        userId: actor,
        status: 'ACTIVE',
        leftAt: null,
        roles: { some: { role: { in: ['FOUNDER', 'ADMIN'] } } },
      },
      select: { groupId: true },
    });
    // Epoch avoids session-timezone-dependent raw timestamp decoding by the adapter.
    const [{ nowMs }] = await tx.$queryRaw<{ nowMs: number }[]>`
      SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "nowMs"`;
    const now = new Date(nowMs);
    const windows = thumbnailWindows([...entries.values()]);
    const current = windows.find((w) => w.startsAt <= now && now < w.expiresAt);
    return {
      chapter,
      admin,
      windows,
      current,
      now,
      groups: new Set(memberships.map((m) => m.groupId)),
    };
  }

  private permitted(
    ctx: Awaited<ReturnType<EditorialThumbnailsService['context']>>,
    groupId: string | undefined,
    request: boolean,
  ) {
    if (ctx.admin && !groupId) return;
    const eligible = ctx.windows.find((w) => w.groupId === groupId);
    if (!groupId || !ctx.groups.has(groupId) || !eligible?.currentlyEligible)
      throw insufficientPermission();
    if (!request && ctx.current?.groupId !== groupId)
      throw editorialConflict('CHAPTER_THUMBNAIL_NOT_PRIORITY');
  }

  private view(
    ctx: Awaited<ReturnType<EditorialThumbnailsService['context']>>,
  ) {
    const c = ctx.chapter;
    return {
      chapterId: c.id,
      fixed: c.thumbnailAssetId !== null,
      fallbackRequired: c.thumbnailAssetId === null,
      thumbnail: c.thumbnailAssetId
        ? {
            assetId: c.thumbnailAssetId,
            previewUrl: `/media/editorial/chapters/${c.id}/thumbnails/${c.thumbnailAssetId}`,
            definedByUserId: c.thumbnailActorUserId,
            groupId: c.thumbnailGroupId,
            definedAt: c.thumbnailSetAt?.toISOString() ?? null,
          }
        : null,
      priority:
        c.thumbnailAssetId || !ctx.current
          ? null
          : {
              groupId: ctx.current.groupId,
              currentlyEligible: ctx.current.currentlyEligible,
              startsAt: ctx.current.startsAt.toISOString(),
              expiresAt: ctx.current.expiresAt.toISOString(),
            },
      canOverride: ctx.admin,
      canSet:
        !c.thumbnailAssetId &&
        (ctx.admin ||
          !!(
            ctx.current?.currentlyEligible &&
            ctx.groups.has(ctx.current.groupId)
          )),
    };
  }

  async status(actor: string, chapterId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ctx = await this.context(tx, actor, chapterId);
      const pending = await tx.chapterThumbnailRequest.findMany({
        where: {
          chapterId,
          status: 'PENDING',
          groupId: { in: [...ctx.groups] },
        },
        select: { groupId: true },
      });
      return {
        ...this.view(ctx),
        actorGroups: ctx.windows
          .filter((w) => ctx.groups.has(w.groupId))
          .map((w) => ({
            groupId: w.groupId,
            currentlyEligible: w.currentlyEligible,
            historicalStartsAt: w.startsAt.toISOString(),
            historicalExpiresAt: w.expiresAt.toISOString(),
            hasPendingRequest: pending.some((p) => p.groupId === w.groupId),
            canRequestChange:
              !!ctx.chapter.thumbnailAssetId &&
              w.currentlyEligible &&
              !pending.some((p) => p.groupId === w.groupId),
          })),
      };
    });
  }

  async assertUpload(
    actor: string,
    chapterId: string,
    groupId: string | null,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const ctx = await this.context(tx, actor, chapterId);
    this.permitted(ctx, groupId ?? undefined, !!ctx.chapter.thumbnailAssetId);
    return ctx;
  }

  async createIntent(
    actor: string,
    chapterId: string,
    dto: ThumbnailIntentDto,
  ) {
    await this.assertUpload(actor, chapterId, dto.groupId ?? null);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 300_000);
    const temporaryStorageKey = `tmp/editorial/${randomUUID()}`;
    const signed = await this.storage.createPresignedUpload({
      key: temporaryStorageKey,
      contentType: dto.contentType,
      expectedBytes: dto.expectedBytes,
      now,
      expiresAt,
    });
    const intent = await this.prisma.$transaction(async (tx) => {
      await this.assertUpload(actor, chapterId, dto.groupId ?? null, tx);
      return tx.editorialUploadIntent.create({
        data: {
          purpose: 'CHAPTER_THUMBNAIL',
          actorUserId: actor,
          chapterId,
          thumbnailGroupId: dto.groupId ?? null,
          temporaryStorageKey,
          expectedBytes: BigInt(dto.expectedBytes),
          maxBytes: BigInt(THUMBNAIL_MAX_BYTES),
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

  private async asset(
    tx: Prisma.TransactionClient,
    chapterId: string,
    assetId: string,
    actor: string,
    groupId: string | null,
  ) {
    const asset = await tx.asset.findFirst({
      where: {
        id: assetId,
        status: 'READY',
        ownerUserId: actor,
        uploadIntent: {
          purpose: 'CHAPTER_THUMBNAIL',
          state: 'FINALIZED',
          chapterId,
          actorUserId: actor,
          thumbnailGroupId: groupId,
        },
      },
      select: {
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        width: true,
        height: true,
      },
    });
    if (
      !asset ||
      !isFinalThumbnailKey(asset.storageKey) ||
      !THUMBNAIL_CONTENT_TYPES.some((t) => t === asset.mimeType) ||
      asset.sizeBytes <= 0n ||
      asset.sizeBytes > BigInt(THUMBNAIL_MAX_BYTES) ||
      !asset.width ||
      !asset.height ||
      asset.width * asset.height > THUMBNAIL_MAX_PIXELS
    )
      throw editorialConflict('CHAPTER_THUMBNAIL_ASSET_INVALID');
  }

  async set(
    actor: string,
    chapterId: string,
    dto: SetThumbnailDto,
    override = false,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (override) await this.authorization.assertAdmin(actor, tx);
      else await this.context(tx, actor, chapterId);
      await this.lock(tx, chapterId);
      const ctx = await this.context(tx, actor, chapterId);
      if (override) await this.authorization.assertAdmin(actor, tx);
      else {
        if (ctx.chapter.thumbnailAssetId)
          throw editorialConflict('CHAPTER_THUMBNAIL_FIXED');
        this.permitted(ctx, dto.groupId, false);
      }
      const groupId = override ? null : (dto.groupId ?? null);
      await this.asset(tx, chapterId, dto.assetId, actor, groupId);
      if (ctx.chapter.thumbnailAssetId === dto.assetId)
        throw editorialConflict('CHAPTER_THUMBNAIL_NO_CHANGE');
      await tx.chapter.update({
        where: { id: chapterId },
        data: {
          thumbnailAssetId: dto.assetId,
          thumbnailActorUserId: actor,
          thumbnailGroupId: groupId,
          thumbnailSetAt: ctx.now,
        },
      });
      await this.supersede(tx, chapterId, actor, ctx.now);
      await this.audit.write(tx, {
        actorUserId: actor,
        chapterId,
        groupId,
        actionType: override
          ? 'CHAPTER_THUMBNAIL_OVERRIDDEN'
          : 'CHAPTER_THUMBNAIL_SET',
        createdAt: ctx.now,
        previousAssetId: ctx.chapter.thumbnailAssetId,
        proposedAssetId: dto.assetId,
      });
      return this.view(await this.context(tx, actor, chapterId));
    });
  }

  async request(actor: string, chapterId: string, dto: RequestThumbnailDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.context(tx, actor, chapterId);
      await this.lock(tx, chapterId);
      const ctx = await this.context(tx, actor, chapterId);
      if (!ctx.chapter.thumbnailAssetId)
        throw editorialConflict('CHAPTER_THUMBNAIL_NOT_FIXED');
      this.permitted(ctx, dto.groupId, true);
      await this.asset(tx, chapterId, dto.assetId, actor, dto.groupId);
      if (ctx.chapter.thumbnailAssetId === dto.assetId)
        throw editorialConflict('CHAPTER_THUMBNAIL_NO_CHANGE');
      const existing = await tx.chapterThumbnailRequest.findFirst({
        where: { chapterId, groupId: dto.groupId, status: 'PENDING' },
        select: { id: true },
      });
      if (existing)
        throw editorialConflict('CHAPTER_THUMBNAIL_REQUEST_PENDING');
      const request = await tx.chapterThumbnailRequest.create({
        data: {
          chapterId,
          groupId: dto.groupId,
          requesterUserId: actor,
          proposedAssetId: dto.assetId,
        },
        select: { id: true, status: true, createdAt: true },
      });
      await this.audit.write(tx, {
        actorUserId: actor,
        chapterId,
        groupId: dto.groupId,
        actionType: 'CHAPTER_THUMBNAIL_REQUESTED',
        thumbnailRequestId: request.id,
        createdAt: ctx.now,
        previousAssetId: ctx.chapter.thumbnailAssetId,
        proposedAssetId: dto.assetId,
      });
      return {
        request: { ...request, createdAt: request.createdAt.toISOString() },
      };
    });
  }

  private async supersede(
    tx: Prisma.TransactionClient,
    chapterId: string,
    actor: string,
    now: Date,
  ) {
    await tx.chapterThumbnailRequest.updateMany({
      where: { chapterId, status: 'PENDING' },
      data: { status: 'SUPERSEDED', resolverUserId: actor, resolvedAt: now },
    });
  }

  async resolve(
    actor: string,
    chapterId: string,
    requestId: string,
    approve: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.authorization.assertAdmin(actor, tx);
      await this.lock(tx, chapterId);
      await this.authorization.assertAdmin(actor, tx);
      const ctx = await this.context(tx, actor, chapterId);
      const request = await tx.chapterThumbnailRequest.findFirst({
        where: { id: requestId, chapterId },
      });
      if (!request) throw editorialNotFound();
      if (request.status !== 'PENDING')
        throw editorialConflict('CHAPTER_THUMBNAIL_REQUEST_NOT_PENDING');
      if (approve) {
        await this.asset(
          tx,
          chapterId,
          request.proposedAssetId,
          request.requesterUserId,
          request.groupId,
        );
        await tx.chapter.update({
          where: { id: chapterId },
          data: {
            thumbnailAssetId: request.proposedAssetId,
            thumbnailActorUserId: actor,
            thumbnailGroupId: request.groupId,
            thumbnailSetAt: ctx.now,
          },
        });
      }
      await tx.chapterThumbnailRequest.update({
        where: { id: requestId },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          resolverUserId: actor,
          resolvedAt: ctx.now,
        },
      });
      if (approve) await this.supersede(tx, chapterId, actor, ctx.now);
      await this.audit.write(tx, {
        actorUserId: actor,
        chapterId,
        groupId: request.groupId,
        thumbnailRequestId: request.id,
        actionType: approve
          ? 'CHAPTER_THUMBNAIL_APPROVED'
          : 'CHAPTER_THUMBNAIL_REJECTED',
        createdAt: ctx.now,
        previousAssetId: ctx.chapter.thumbnailAssetId,
        proposedAssetId: request.proposedAssetId,
      });
      return { requestId, status: approve ? 'APPROVED' : 'REJECTED' };
    });
  }

  async list(actor: string, chapterId: string, page: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.authorization.assertAdmin(actor, tx);
      await this.context(tx, actor, chapterId);
      const where = { chapterId };
      const [total, requests] = await Promise.all([
        tx.chapterThumbnailRequest.count({ where }),
        tx.chapterThumbnailRequest.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * 50,
          take: 50,
          select: {
            id: true,
            groupId: true,
            requesterUserId: true,
            proposedAssetId: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
            resolverUserId: true,
          },
        }),
      ]);
      return {
        page,
        pageSize: 50,
        total,
        requests: requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          resolvedAt: r.resolvedAt?.toISOString() ?? null,
          previewUrl: `/media/editorial/chapters/${chapterId}/thumbnails/${r.proposedAssetId}`,
        })),
      };
    });
  }

  async preview(actor: string, chapterId: string, assetId: string) {
    const key = await this.prisma.$transaction(async (tx) => {
      const ctx = await this.context(tx, actor, chapterId);
      const asset = await tx.asset.findFirst({
        where: {
          id: assetId,
          status: 'READY',
          uploadIntent: {
            chapterId,
            purpose: 'CHAPTER_THUMBNAIL',
            state: 'FINALIZED',
          },
        },
        select: { storageKey: true, ownerUserId: true },
      });
      if (
        !asset ||
        !isFinalThumbnailKey(asset.storageKey) ||
        (!ctx.admin &&
          ctx.chapter.thumbnailAssetId !== assetId &&
          asset.ownerUserId !== actor)
      )
        throw editorialNotFound();
      return asset.storageKey;
    });
    return this.storage.createPresignedDownload(key);
  }

  async publicPreview(chapterId: string) {
    const readableRelease = publicReadableReleaseSql({
      mediaApiOrigin: this.config.get<string>('MEDIA_API_ORIGIN'),
      objectStorageBucket: this.config.get<string>('OBJECT_STORAGE_BUCKET'),
      objectStorageEndpoint: this.config.get<string>('OBJECT_STORAGE_ENDPOINT'),
    });
    const chapter = await this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        status: 'ACTIVE',
        manga: { editorialStatus: 'PUBLIC', contentRating: { not: 'ADULT' } },
        releases: {
          some: {
            status: 'PUBLISHED',
            pages: { some: { asset: { status: 'READY' } } },
          },
        },
        thumbnailAsset: {
          is: {
            status: 'READY',
            uploadIntent: {
              is: {
                purpose: 'CHAPTER_THUMBNAIL',
                state: 'FINALIZED',
                chapterId,
              },
            },
          },
        },
      },
      select: {
        thumbnailAsset: {
          select: {
            storageKey: true,
            mimeType: true,
            sizeBytes: true,
            width: true,
            height: true,
          },
        },
      },
    });
    const asset = chapter?.thumbnailAsset;
    if (
      !asset ||
      !isFinalThumbnailKey(asset.storageKey) ||
      !THUMBNAIL_CONTENT_TYPES.some((type) => type === asset.mimeType) ||
      asset.sizeBytes <= 0n ||
      asset.sizeBytes > BigInt(THUMBNAIL_MAX_BYTES) ||
      !asset.width ||
      !asset.height ||
      asset.width * asset.height > THUMBNAIL_MAX_PIXELS
    )
      throw editorialNotFound();
    const readable = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r."id" FROM "ChapterRelease" r
      WHERE r."chapterId" = ${chapterId}::uuid AND ${readableRelease}
      LIMIT 1`;
    if (readable.length === 0) throw editorialNotFound();
    return this.storage.createPresignedDownload(asset.storageKey);
  }
}
