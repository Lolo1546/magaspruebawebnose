import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { EditorialAuditWriter } from './editorial-audit.writer.js';
import { editorialConflict, editorialNotFound } from './editorial.errors.js';
import {
  editorialReleaseSelect,
  mapEditorialRelease,
} from './editorial-chapter.mapper.js';
import { assertReleasePublishable } from './editorial-release-readiness.js';
import type { EditorialReleaseParamsDto } from './dto/editorial-chapter.dto.js';
import type { EditorialReleaseTransitionDto } from './dto/editorial-release-transition.dto.js';

const transitionSelect = {
  ...editorialReleaseSelect,
  chapter: { select: { mangaId: true, status: true } },
  project: { select: { mangaId: true } },
} satisfies Prisma.ChapterReleaseSelect;

@Injectable()
export class EditorialReleaseLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly audit: EditorialAuditWriter,
  ) {}

  private async load(
    tx: Prisma.TransactionClient,
    actor: string,
    context: EditorialReleaseParamsDto,
  ) {
    const scope = await this.authorization.projectReadScope(actor, tx);
    const release = await tx.chapterRelease.findFirst({
      where: {
        id: context.releaseId,
        chapterId: context.chapterId,
        projectId: context.projectId,
        project: { is: scope },
      },
      select: transitionSelect,
    });
    if (
      !release ||
      !release.project ||
      !release.publishingGroupId ||
      release.chapter.mangaId !== release.project.mangaId
    )
      throw editorialNotFound();
    return release;
  }

  async transition(
    actor: string,
    context: EditorialReleaseParamsDto,
    dto: EditorialReleaseTransitionDto,
    action: 'publish' | 'withdraw',
  ) {
    try {
      // READ COMMITTED + row locks matches PAGE append/reorder. No silent stale-version retries.
      return await this.prisma.$transaction(async (tx) => {
        const initial = await this.load(tx, actor, context);
        await this.authorization.assertPublishing(
          actor,
          context.projectId,
          initial.publishingGroupId!,
          action,
          tx,
        );
        const ids = [context.releaseId];
        if (action === 'publish' && initial.supersedesReleaseId)
          ids.push(initial.supersedesReleaseId);
        // A single ordered locking query prevents reciprocal replacement lock-order deadlocks.
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ChapterRelease"
          WHERE "id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
          ORDER BY "id" FOR UPDATE`);
        const release = await this.load(tx, actor, context);
        await this.authorization.assertPublishing(
          actor,
          context.projectId,
          release.publishingGroupId!,
          action,
          tx,
        );
        if (release.supersedesReleaseId !== initial.supersedesReleaseId)
          throw editorialConflict('EDITORIAL_REPLACEMENT_INVALID');
        if (release.version !== dto.expectedVersion)
          throw editorialConflict('EDITORIAL_RELEASE_STALE_VERSION');
        if (release.version >= 2147483647)
          throw editorialConflict('EDITORIAL_RELEASE_CAPACITY_EXCEEDED');
        const required = action === 'publish' ? 'DRAFT' : 'PUBLISHED';
        if (release.status !== required)
          throw editorialConflict(
            action === 'publish'
              ? 'EDITORIAL_RELEASE_NOT_DRAFT'
              : 'EDITORIAL_RELEASE_NOT_PUBLISHED',
          );
        const now = new Date();
        if (action === 'publish') {
          if (release.chapter.status !== 'ACTIVE')
            throw editorialConflict('EDITORIAL_CHAPTER_NOT_ACTIVE');
          const pages = await tx.chapterPage.findMany({
            where: { chapterReleaseId: release.id },
            orderBy: { pageNumber: 'asc' },
            select: {
              pageNumber: true,
              assetId: true,
              asset: {
                select: {
                  status: true,
                  storageKey: true,
                  mimeType: true,
                  width: true,
                  height: true,
                  sizeBytes: true,
                  uploadIntent: {
                    select: { releaseId: true, purpose: true, state: true },
                  },
                },
              },
            },
          });
          assertReleasePublishable(release.id, release.language, pages);
          if (release.supersedesReleaseId) {
            const original = await tx.chapterRelease.findUnique({
              where: { id: release.supersedesReleaseId },
              select: editorialReleaseSelect,
            });
            if (
              !original ||
              original.id === release.id ||
              original.projectId !== release.projectId ||
              original.chapterId !== release.chapterId ||
              original.publishingGroupId !== release.publishingGroupId ||
              original.language.trim().toLowerCase() !==
                release.language.trim().toLowerCase()
            )
              throw editorialConflict('EDITORIAL_REPLACEMENT_INVALID');
            if (original.status !== 'PUBLISHED')
              throw editorialConflict(
                'EDITORIAL_REPLACEMENT_NO_LONGER_PUBLISHED',
              );
            await this.writeTransition(
              tx,
              actor,
              original.id,
              original.version,
              'withdraw',
              now,
            );
          }
          // Preserve public group attribution without changing release responsibility.
          await tx.chapterReleaseGroup.upsert({
            where: {
              chapterReleaseId_groupId: {
                chapterReleaseId: release.id,
                groupId: release.publishingGroupId!,
              },
            },
            create: {
              chapterReleaseId: release.id,
              groupId: release.publishingGroupId!,
            },
            update: {},
          });
        }
        await this.writeTransition(
          tx,
          actor,
          release.id,
          release.version,
          action,
          now,
        );
        const updated = await tx.chapterRelease.findUniqueOrThrow({
          where: { id: release.id },
          select: editorialReleaseSelect,
        });
        return { release: mapEditorialRelease(updated) };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw editorialConflict('EDITORIAL_RELEASE_ALREADY_PUBLISHED');
      throw error;
    }
  }

  private async writeTransition(
    tx: Prisma.TransactionClient,
    actor: string,
    id: string,
    version: number,
    action: 'publish' | 'withdraw',
    now: Date,
  ) {
    if (version >= 2147483647)
      throw editorialConflict('EDITORIAL_RELEASE_CAPACITY_EXCEEDED');
    const changed = await tx.chapterRelease.updateMany({
      where: {
        id,
        version,
        status: action === 'publish' ? 'DRAFT' : 'PUBLISHED',
      },
      data: {
        status: action === 'publish' ? 'PUBLISHED' : 'WITHDRAWN',
        version: { increment: 1 },
        ...(action === 'publish' ? { publishedAt: now } : {}),
      },
    });
    if (changed.count !== 1)
      throw editorialConflict('EDITORIAL_RELEASE_STALE_VERSION');
    await this.audit.write(tx, {
      actorUserId: actor,
      releaseId: id,
      actionType:
        action === 'publish' ? 'RELEASE_PUBLISHED' : 'RELEASE_WITHDRAWN',
      fromVersion: version,
      toVersion: version + 1,
      createdAt: now,
    });
  }
}
