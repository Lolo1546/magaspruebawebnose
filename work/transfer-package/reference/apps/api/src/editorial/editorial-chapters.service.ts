import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import {
  editorialConflict,
  editorialProjectNotFound,
} from './editorial.errors.js';
import { runEditorialSerializableTransaction } from './editorial-transaction.js';
import type {
  CreateEditorialChapterDto,
  CreateEditorialReleaseDto,
} from './dto/editorial-chapter.dto.js';
import type { EditorialProjectQueryDto } from './dto/editorial-project-query.dto.js';
import {
  editorialChapterSelect,
  editorialReleaseSelect,
  mapEditorialChapter,
  mapEditorialRelease,
} from './editorial-chapter.mapper.js';

function notFound(resource: 'CHAPTER' | 'RELEASE') {
  return new NotFoundException({
    statusCode: 404,
    code: `EDITORIAL_${resource}_NOT_FOUND`,
    message: 'Editorial resource not found.',
  });
}

function pagination(total: number, query: EditorialProjectQueryDto) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

@Injectable()
export class EditorialChaptersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
  ) {}

  private async project(
    tx: Prisma.TransactionClient,
    actor: string,
    projectId: string,
  ) {
    const scope = await this.authorization.projectReadScope(actor, tx);
    const project = await tx.scanlationProject.findFirst({
      where: { AND: [scope, { id: projectId }] },
      select: { mangaId: true },
    });
    if (!project) throw editorialProjectNotFound();
    return project;
  }

  private async chapter(
    tx: Prisma.TransactionClient,
    mangaId: string,
    chapterId: string,
  ) {
    const chapter = await tx.chapter.findFirst({
      where: { id: chapterId, mangaId },
      select: editorialChapterSelect,
    });
    if (!chapter) throw notFound('CHAPTER');
    return chapter;
  }

  createChapter(
    actor: string,
    projectId: string,
    dto: CreateEditorialChapterDto,
  ) {
    return this.write(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      await this.authorization.assertPublishing(
        actor,
        projectId,
        dto.groupId,
        'prepare',
        tx,
      );
      const row = await tx.chapter.create({
        data: {
          mangaId: project.mangaId,
          kind: dto.kind,
          number: dto.number ?? null,
          displayLabel: dto.displayLabel,
          sortOrder: dto.sortOrder,
          title: dto.title || null,
          status: 'ACTIVE',
        },
        select: editorialChapterSelect,
      });
      return { chapter: mapEditorialChapter(row) };
    }, 'EDITORIAL_CHAPTER_DUPLICATE');
  }

  listChapters(
    actor: string,
    projectId: string,
    query: EditorialProjectQueryDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      const where = { mangaId: project.mangaId };
      const total = await tx.chapter.count({ where });
      const rows = await tx.chapter.findMany({
        where,
        select: editorialChapterSelect,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      return {
        items: rows.map(mapEditorialChapter),
        pagination: pagination(total, query),
      };
    });
  }

  chapterDetail(actor: string, projectId: string, chapterId: string) {
    return this.prisma.$transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      return {
        chapter: mapEditorialChapter(
          await this.chapter(tx, project.mangaId, chapterId),
        ),
      };
    });
  }

  createRelease(
    actor: string,
    projectId: string,
    chapterId: string,
    dto: CreateEditorialReleaseDto,
  ) {
    // Serializable keeps DB-fresh authority, eligibility and replacement reads in
    // the same snapshot as creation, with the existing bounded 40001/P2034 retry.
    return this.write(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      await this.authorization.assertPublishing(
        actor,
        projectId,
        dto.publishingGroupId,
        'prepare',
        tx,
      );
      const chapter = await this.chapter(tx, project.mangaId, chapterId);
      if (chapter.status !== 'ACTIVE')
        throw editorialConflict('EDITORIAL_CHAPTER_NOT_ACTIVE');
      if (dto.supersedesReleaseId) {
        const previous = await tx.chapterRelease.findFirst({
          where: {
            id: dto.supersedesReleaseId,
            projectId,
            chapterId,
            publishingGroupId: dto.publishingGroupId,
            status: 'PUBLISHED',
          },
          select: { language: true },
        });
        if (
          !previous ||
          previous.language.trim().toLowerCase() !== dto.language.toLowerCase()
        ) {
          throw editorialConflict('EDITORIAL_REPLACEMENT_INVALID');
        }
      }
      const row = await tx.chapterRelease.create({
        data: {
          chapterId,
          projectId,
          publishingGroupId: dto.publishingGroupId,
          uploadedByUserId: actor,
          language: dto.language,
          status: 'DRAFT',
          version: 1,
          supersedesReleaseId: dto.supersedesReleaseId ?? null,
        },
        select: editorialReleaseSelect,
      });
      return { release: mapEditorialRelease(row) };
    });
  }

  listReleases(
    actor: string,
    projectId: string,
    chapterId: string,
    query: EditorialProjectQueryDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      await this.chapter(tx, project.mangaId, chapterId);
      const where = { projectId, chapterId };
      const total = await tx.chapterRelease.count({ where });
      const rows = await tx.chapterRelease.findMany({
        where,
        select: editorialReleaseSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      return {
        items: rows.map(mapEditorialRelease),
        pagination: pagination(total, query),
      };
    });
  }

  releaseDetail(
    actor: string,
    projectId: string,
    chapterId: string,
    releaseId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const project = await this.project(tx, actor, projectId);
      await this.chapter(tx, project.mangaId, chapterId);
      const row = await tx.chapterRelease.findFirst({
        where: { id: releaseId, projectId, chapterId },
        select: editorialReleaseSelect,
      });
      if (!row) throw notFound('RELEASE');
      return { release: mapEditorialRelease(row) };
    });
  }

  private async write<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    uniqueCode = 'EDITORIAL_CONFLICT',
  ): Promise<T> {
    try {
      return await runEditorialSerializableTransaction(this.prisma, operation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw editorialConflict(uniqueCode);
      }
      throw error;
    }
  }
}
