import { Injectable } from '@nestjs/common';
import { runEditorialSerializableTransaction } from './editorial-transaction.js';
import {
  Prisma,
  EditorialAuditActionType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { EditorialAuditWriter } from './editorial-audit.writer.js';
import {
  editorialConflict,
  editorialProjectNotFound,
  editorialMangaNotFound,
  editorialGroupNotFound,
} from './editorial.errors.js';
import type { EditorialProjectQueryDto } from './dto/editorial-project-query.dto.js';
import type { EditorialProjectListDto } from './dto/editorial-project-response.dto.js';
import {
  editorialProjectReadSelect,
  mapEditorialProject,
} from './editorial-project.mapper.js';

const projectSelect = {
  id: true,
  mangaId: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ScanlationProjectSelect;

@Injectable()
export class EditorialProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly audit: EditorialAuditWriter,
  ) {}

  async list(
    actorUserId: string,
    query: EditorialProjectQueryDto,
  ): Promise<EditorialProjectListDto> {
    const where = await this.authorization.projectReadScope(actorUserId);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.scanlationProject.count({ where }),
      this.prisma.scanlationProject.findMany({
        where,
        select: editorialProjectReadSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(mapEditorialProject),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async detail(actorUserId: string, id: string) {
    const scope = await this.authorization.projectReadScope(actorUserId);
    const row = await this.prisma.scanlationProject.findFirst({
      where: { AND: [scope, { id }] },
      select: editorialProjectReadSelect,
    });
    if (!row) throw editorialProjectNotFound();
    return { project: mapEditorialProject(row) };
  }

  create(actorUserId: string, mangaId: string, initialGroupId: string) {
    return this.run(async (tx) => {
      await this.authorization.assertAdmin(actorUserId, tx);
      const manga = await tx.manga.findUnique({
        where: { id: mangaId },
        select: { contentRating: true },
      });
      if (!manga) throw editorialMangaNotFound();
      if (manga.contentRating === 'ADULT')
        throw editorialConflict('EDITORIAL_ADULT_NOT_ALLOWED');
      await this.verifiedGroup(tx, initialGroupId);
      const project = await tx.scanlationProject.create({
        data: { mangaId, status: 'ACTIVE', createdByUserId: actorUserId },
        select: projectSelect,
      });
      await tx.projectGroup.create({
        data: {
          projectId: project.id,
          groupId: initialGroupId,
          status: 'ACTIVE',
        },
      });
      await this.audit.write(tx, {
        actorUserId,
        projectId: project.id,
        groupId: initialGroupId,
        actionType: EditorialAuditActionType.PROJECT_CREATED,
      });
      return {
        project: { ...project, createdAt: project.createdAt.toISOString() },
      };
    });
  }

  addGroup(actorUserId: string, projectId: string, groupId: string) {
    return this.run(async (tx) => {
      await this.authorization.assertAdmin(actorUserId, tx);
      await this.manageableProject(tx, projectId);
      await this.verifiedGroup(tx, groupId);
      const existing = await tx.projectGroup.findFirst({
        where: { projectId, groupId, leftAt: null },
        select: { id: true },
      });
      if (existing)
        throw editorialConflict('EDITORIAL_GROUP_ALREADY_PARTICIPATING');
      const participation = await tx.projectGroup.create({
        data: { projectId, groupId, status: 'ACTIVE' },
        select: {
          id: true,
          projectId: true,
          groupId: true,
          status: true,
          joinedAt: true,
          leftAt: true,
        },
      });
      await this.audit.write(tx, {
        actorUserId,
        projectId,
        groupId,
        actionType: EditorialAuditActionType.PROJECT_GROUP_ADDED,
      });
      return {
        participation: {
          ...participation,
          joinedAt: participation.joinedAt.toISOString(),
          leftAt: null,
        },
      };
    });
  }

  removeGroup(actorUserId: string, projectId: string, groupId: string) {
    return this.run(async (tx) => {
      await this.authorization.assertAdmin(actorUserId, tx);
      const project = await this.manageableProject(tx, projectId);
      const participation = await tx.projectGroup.findFirst({
        where: { projectId, groupId, status: 'ACTIVE', leftAt: null },
        select: { id: true },
      });
      if (!participation)
        throw editorialConflict('EDITORIAL_GROUP_NOT_PARTICIPATING');
      if (project.status === 'ACTIVE') {
        const remaining = await tx.projectGroup.count({
          where: {
            projectId,
            groupId: { not: groupId },
            status: 'ACTIVE',
            leftAt: null,
            group: { status: 'VERIFIED' },
          },
        });
        if (remaining < 1)
          throw editorialConflict('EDITORIAL_LAST_OPERATIONAL_GROUP');
      }
      const leftAt = new Date();
      const result = await tx.projectGroup.updateMany({
        where: { id: participation.id, status: 'ACTIVE', leftAt: null },
        data: { status: 'REMOVED', leftAt },
      });
      if (result.count !== 1) throw editorialConflict();
      await this.audit.write(tx, {
        actorUserId,
        projectId,
        groupId,
        actionType: EditorialAuditActionType.PROJECT_GROUP_REMOVED,
      });
      return {
        participation: {
          id: participation.id,
          projectId,
          groupId,
          status: 'REMOVED',
          leftAt: leftAt.toISOString(),
        },
      };
    });
  }

  private async verifiedGroup(tx: Prisma.TransactionClient, groupId: string) {
    const group = await tx.scanlationGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!group) throw editorialGroupNotFound();
    if (group.status !== 'VERIFIED')
      throw editorialConflict('EDITORIAL_GROUP_NOT_VERIFIED');
  }

  private async manageableProject(
    tx: Prisma.TransactionClient,
    projectId: string,
  ) {
    const project = await tx.scanlationProject.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (!project) throw editorialProjectNotFound();
    if (project.status !== 'ACTIVE' && project.status !== 'PAUSED')
      throw editorialConflict('EDITORIAL_PROJECT_NOT_MANAGEABLE');
    return project;
  }

  private async run<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await runEditorialSerializableTransaction(this.prisma, operation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw editorialConflict();
      }
      throw error;
    }
  }
}
