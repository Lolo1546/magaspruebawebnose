import { Injectable } from '@nestjs/common';
import {
  ContentRating,
  EditorialAuditActionType,
  MangaEditorialStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateEditorialMangaDto,
  EditorialMangaCreatorDto,
  EditorialMangaQueryDto,
  HideEditorialMangaDto,
  PublishEditorialMangaDto,
  UpdateEditorialMangaDto,
} from './dto/editorial-manga.dto.js';
import type {
  EditorialMangaListDto,
  EditorialMangaResponseDto,
} from './dto/editorial-manga-response.dto.js';
import { EditorialAuditWriter } from './editorial-audit.writer.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import {
  editorialConflict,
  editorialMangaAdultUnsupported,
  editorialMangaDuplicate,
  editorialMangaInvalidMetadata,
  editorialMangaNotFound,
  editorialMangaNotReady,
  editorialMangaSlugConflict,
  editorialMangaStale,
  editorialMangaTransition,
} from './editorial.errors.js';
import {
  editorialMangaDetailSelect,
  editorialMangaSummarySelect,
  EditorialMangaMapper,
} from './editorial-manga.mapper.js';
import {
  createEditorialMangaSlugBase,
  createEditorialMangaSlugCandidates,
} from './editorial-manga-slug.js';
import { normalizeEditorialTitle } from './editorial-title-normalizer.js';
import { runEditorialSerializableTransaction } from './editorial-transaction.js';
import { missingPublicationRequirements } from './editorial-manga-readiness.js';

type MangaMetadata = Pick<
  CreateEditorialMangaDto,
  | 'title'
  | 'originalTitle'
  | 'description'
  | 'type'
  | 'demography'
  | 'status'
  | 'contentRating'
  | 'publicationYear'
>;

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class EditorialMangasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
    private readonly audit: EditorialAuditWriter,
    private readonly mapper: EditorialMangaMapper,
  ) {}

  async list(
    actorUserId: string,
    query: EditorialMangaQueryDto,
  ): Promise<EditorialMangaListDto> {
    await this.authorization.assertCatalogManager(actorUserId);
    const normalizedQuery = query.q
      ? normalizeEditorialTitle(query.q)
      : undefined;
    const where: Prisma.MangaWhereInput = {
      ...(query.demography ? { demography: query.demography } : {}),
      ...(query.editorialStatus
        ? { editorialStatus: query.editorialStatus }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { normalizedTitle: { contains: normalizedQuery } },
              {
                aliases: {
                  some: { normalizedAlias: { contains: normalizedQuery } },
                },
              },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.manga.count({ where }),
      this.prisma.manga.findMany({
        where,
        select: editorialMangaSummarySelect,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => this.mapper.toSummary(row)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async detail(
    actorUserId: string,
    mangaId: string,
  ): Promise<EditorialMangaResponseDto> {
    await this.authorization.assertCatalogManager(actorUserId);
    const manga = await this.prisma.manga.findUnique({
      where: { id: mangaId },
      select: editorialMangaDetailSelect,
    });
    if (!manga) throw editorialMangaNotFound();
    return { manga: this.mapper.toDetail(manga) };
  }

  create(
    actorUserId: string,
    dto: CreateEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.runSerializable(async (tx) => {
      await this.authorization.assertCatalogManager(actorUserId, tx);
      this.assertNonAdult(dto.contentRating);
      const aliases = this.aliasData(dto.aliases ?? [], dto.title);
      await this.validateRelationIds(
        tx,
        dto.genreIds ?? [],
        dto.creators ?? [],
      );
      const collision = await this.hasDuplicate(tx, [
        normalizeEditorialTitle(dto.title),
        ...aliases.map((a) => a.normalizedAlias),
      ]);
      const overrideReason = await this.resolveDuplicateOverride(
        tx,
        actorUserId,
        collision,
        dto.duplicateOverrideReason,
      );
      const slug = await this.resolveSlug(tx, dto.title);
      const manga = await tx.manga.create({
        data: {
          title: dto.title,
          normalizedTitle: normalizeEditorialTitle(dto.title),
          slug,
          originalTitle: dto.originalTitle ?? null,
          description: dto.description ?? null,
          type: dto.type,
          demography: dto.demography ?? null,
          status: dto.status,
          contentRating: dto.contentRating,
          publicationYear: dto.publicationYear ?? null,
          editorialStatus: MangaEditorialStatus.DRAFT,
          version: 1,
          aliases: { create: aliases },
          genres: {
            create: (dto.genreIds ?? []).map((genreId) => ({ genreId })),
          },
          creators: {
            create: (dto.creators ?? []).map((creator) => ({
              creatorId: creator.creatorId,
              contributionType: creator.contributionType,
            })),
          },
        },
        select: { id: true },
      });
      await this.audit.write(tx, {
        actorUserId,
        mangaId: manga.id,
        actionType: EditorialAuditActionType.MANGA_CREATED,
        reason: overrideReason,
        toVersion: 1,
      });
      return this.readResult(tx, manga.id);
    });
  }

  update(
    actorUserId: string,
    mangaId: string,
    dto: UpdateEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.runSerializable(async (tx) => {
      await this.authorization.assertCatalogManager(actorUserId, tx);
      const current = await tx.manga.findUnique({
        where: { id: mangaId },
        select: {
          title: true,
          originalTitle: true,
          description: true,
          type: true,
          demography: true,
          status: true,
          contentRating: true,
          publicationYear: true,
          version: true,
          aliases: {
            select: { alias: true, normalizedAlias: true, languageCode: true },
          },
          genres: { select: { genreId: true } },
          creators: {
            select: { creatorId: true, contributionType: true },
          },
        },
      });
      if (!current) throw editorialMangaNotFound();
      if (current.version !== dto.expectedVersion) throw editorialMangaStale();

      const next: MangaMetadata = {
        title: dto.title ?? current.title,
        originalTitle:
          dto.originalTitle === undefined
            ? current.originalTitle
            : dto.originalTitle,
        description:
          dto.description === undefined ? current.description : dto.description,
        type: dto.type ?? current.type,
        demography:
          dto.demography === undefined ? current.demography : dto.demography,
        status: dto.status ?? current.status,
        contentRating: dto.contentRating ?? current.contentRating,
        publicationYear:
          dto.publicationYear === undefined
            ? current.publicationYear
            : dto.publicationYear,
      };
      this.assertNonAdult(next.contentRating);
      const aliases = this.aliasData(
        dto.aliases ?? current.aliases,
        next.title,
      );
      const genreIds =
        dto.genreIds ?? current.genres.map(({ genreId }) => genreId);
      const creators = dto.creators ?? current.creators;
      await this.validateRelationIds(tx, genreIds, creators);
      if (!this.metadataChanged(current, next, aliases, genreIds, creators)) {
        throw editorialMangaInvalidMetadata();
      }

      const collision = await this.hasDuplicate(
        tx,
        [
          normalizeEditorialTitle(next.title),
          ...aliases.map((a) => a.normalizedAlias),
        ],
        mangaId,
      );
      const overrideReason = await this.resolveDuplicateOverride(
        tx,
        actorUserId,
        collision,
        dto.duplicateOverrideReason,
      );
      const toVersion = current.version + 1;
      const updated = await tx.manga.updateMany({
        where: { id: mangaId, version: current.version },
        data: {
          title: next.title,
          normalizedTitle: normalizeEditorialTitle(next.title),
          originalTitle: next.originalTitle ?? null,
          description: next.description ?? null,
          type: next.type,
          demography: next.demography,
          status: next.status,
          contentRating: next.contentRating,
          publicationYear: next.publicationYear ?? null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw editorialMangaStale();
      if (dto.aliases) {
        await tx.mangaAlias.deleteMany({ where: { mangaId } });
        if (aliases.length) {
          await tx.mangaAlias.createMany({
            data: aliases.map((alias) => ({ mangaId, ...alias })),
          });
        }
      }
      if (dto.genreIds) {
        await tx.mangaGenre.deleteMany({ where: { mangaId } });
        if (genreIds.length) {
          await tx.mangaGenre.createMany({
            data: genreIds.map((genreId) => ({ mangaId, genreId })),
          });
        }
      }
      if (dto.creators) {
        await tx.mangaCreator.deleteMany({ where: { mangaId } });
        if (creators.length) {
          await tx.mangaCreator.createMany({
            data: creators.map((creator) => ({ mangaId, ...creator })),
          });
        }
      }
      await this.audit.write(tx, {
        actorUserId,
        mangaId,
        actionType: EditorialAuditActionType.MANGA_UPDATED,
        reason: overrideReason,
        fromVersion: current.version,
        toVersion,
      });
      return this.readResult(tx, mangaId);
    });
  }

  publish(
    actorUserId: string,
    mangaId: string,
    dto: PublishEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.runSerializable(async (tx) => {
      await this.authorization.assertCatalogManager(actorUserId, tx);
      const current = await tx.manga.findUnique({
        where: { id: mangaId },
        select: {
          title: true,
          normalizedTitle: true,
          type: true,
          status: true,
          description: true,
          demography: true,
          genres: { select: { genreId: true }, take: 1 },
          creators: { select: { creatorId: true }, take: 1 },
          contentRating: true,
          editorialStatus: true,
          version: true,
          aliases: { select: { normalizedAlias: true } },
        },
      });
      if (!current) throw editorialMangaNotFound();
      if (current.version !== dto.expectedVersion) throw editorialMangaStale();
      if (current.editorialStatus !== MangaEditorialStatus.DRAFT) {
        throw editorialMangaTransition();
      }
      this.assertNonAdult(current.contentRating);
      if (!current.title.trim() || !current.normalizedTitle) {
        throw editorialMangaInvalidMetadata();
      }
      const missingRequirements = missingPublicationRequirements(current);
      if (missingRequirements.length) {
        throw editorialMangaNotReady(missingRequirements);
      }
      const collision = await this.hasDuplicate(
        tx,
        [
          current.normalizedTitle,
          ...current.aliases.map(({ normalizedAlias }) => normalizedAlias),
        ],
        mangaId,
      );
      const overrideReason = await this.resolveDuplicateOverride(
        tx,
        actorUserId,
        collision,
        dto.duplicateOverrideReason,
      );
      const toVersion = current.version + 1;
      const result = await tx.manga.updateMany({
        where: {
          id: mangaId,
          version: current.version,
          editorialStatus: MangaEditorialStatus.DRAFT,
        },
        data: {
          editorialStatus: MangaEditorialStatus.PUBLIC,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) throw editorialMangaStale();
      await this.audit.write(tx, {
        actorUserId,
        mangaId,
        actionType: EditorialAuditActionType.MANGA_PUBLISHED,
        reason: overrideReason,
        fromVersion: current.version,
        toVersion,
      });
      return this.readResult(tx, mangaId);
    });
  }

  hide(
    actorUserId: string,
    mangaId: string,
    dto: HideEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.runSerializable(async (tx) => {
      await this.authorization.assertAdmin(actorUserId, tx);
      const current = await tx.manga.findUnique({
        where: { id: mangaId },
        select: { editorialStatus: true, version: true },
      });
      if (!current) throw editorialMangaNotFound();
      if (current.version !== dto.expectedVersion) throw editorialMangaStale();
      if (current.editorialStatus !== MangaEditorialStatus.PUBLIC) {
        throw editorialMangaTransition();
      }
      const toVersion = current.version + 1;
      const result = await tx.manga.updateMany({
        where: {
          id: mangaId,
          version: current.version,
          editorialStatus: MangaEditorialStatus.PUBLIC,
        },
        data: {
          editorialStatus: MangaEditorialStatus.HIDDEN,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) throw editorialMangaStale();
      await this.audit.write(tx, {
        actorUserId,
        mangaId,
        actionType: EditorialAuditActionType.MANGA_HIDDEN,
        reason: dto.reason,
        fromVersion: current.version,
        toVersion,
      });
      return this.readResult(tx, mangaId);
    });
  }

  private aliasData(
    aliases: Array<{ alias: string; languageCode?: string | null }>,
    title: string,
  ) {
    const titleNormalized = normalizeEditorialTitle(title);
    if (!titleNormalized) throw editorialMangaInvalidMetadata();
    const rows = aliases.map((alias) => ({
      alias: alias.alias,
      normalizedAlias: normalizeEditorialTitle(alias.alias),
      languageCode: alias.languageCode ?? null,
    }));
    const normalized = rows.map(({ normalizedAlias }) => normalizedAlias);
    if (
      normalized.some((value) => !value || value === titleNormalized) ||
      new Set(normalized).size !== normalized.length
    ) {
      throw editorialMangaInvalidMetadata();
    }
    return rows;
  }

  private async validateRelationIds(
    tx: TransactionClient,
    genreIds: string[],
    creators: EditorialMangaCreatorDto[],
  ): Promise<void> {
    const creatorIds = [...new Set(creators.map(({ creatorId }) => creatorId))];
    const genreCount = genreIds.length
      ? await tx.genre.count({ where: { id: { in: genreIds } } })
      : 0;
    const creatorCount = creatorIds.length
      ? await tx.creator.count({ where: { id: { in: creatorIds } } })
      : 0;
    if (genreCount !== genreIds.length || creatorCount !== creatorIds.length) {
      throw editorialMangaInvalidMetadata();
    }
  }

  private async hasDuplicate(
    tx: TransactionClient,
    normalizedValues: string[],
    excludeMangaId?: string,
  ): Promise<boolean> {
    const values = [...new Set(normalizedValues)];
    const match = await tx.manga.findFirst({
      where: {
        ...(excludeMangaId ? { id: { not: excludeMangaId } } : {}),
        OR: [
          { normalizedTitle: { in: values } },
          { aliases: { some: { normalizedAlias: { in: values } } } },
        ],
      },
      select: { id: true },
    });
    return Boolean(match);
  }

  private async resolveDuplicateOverride(
    tx: TransactionClient,
    actorUserId: string,
    collision: boolean,
    requestedReason?: string,
  ): Promise<string | undefined> {
    if (!collision) {
      if (requestedReason) throw editorialMangaInvalidMetadata();
      return undefined;
    }
    if (!requestedReason) throw editorialMangaDuplicate();
    await this.authorization.assertAdmin(actorUserId, tx);
    return requestedReason;
  }

  private async resolveSlug(
    tx: TransactionClient,
    title: string,
  ): Promise<string> {
    const candidates = createEditorialMangaSlugCandidates(
      createEditorialMangaSlugBase(title),
    );
    const current = await tx.manga.findMany({
      where: { slug: { in: candidates } },
      select: { slug: true },
    });
    const historical = await tx.mangaSlugHistory.findMany({
      where: { slug: { in: candidates } },
      select: { slug: true },
    });
    const occupied = new Set([
      ...current.map(({ slug }) => slug),
      ...historical.map(({ slug }) => slug),
    ]);
    const candidate = candidates.find((slug) => !occupied.has(slug));
    if (!candidate) throw editorialMangaSlugConflict();
    return candidate;
  }

  private metadataChanged(
    current: {
      title: string;
      originalTitle: string | null;
      description: string | null;
      type: MangaMetadata['type'];
      demography: MangaMetadata['demography'];
      status: MangaMetadata['status'];
      contentRating: MangaMetadata['contentRating'];
      publicationYear: number | null;
      aliases: Array<{
        alias: string;
        normalizedAlias: string;
        languageCode: string | null;
      }>;
      genres: Array<{ genreId: string }>;
      creators: Array<EditorialMangaCreatorDto>;
    },
    next: MangaMetadata,
    aliases: Array<{
      alias: string;
      normalizedAlias: string;
      languageCode: string | null;
    }>,
    genreIds: string[],
    creators: EditorialMangaCreatorDto[],
  ): boolean {
    const scalarChanged =
      current.title !== next.title ||
      current.originalTitle !== (next.originalTitle ?? null) ||
      current.description !== (next.description ?? null) ||
      current.type !== next.type ||
      current.demography !== next.demography ||
      current.status !== next.status ||
      current.contentRating !== next.contentRating ||
      current.publicationYear !== (next.publicationYear ?? null);
    const aliasKey = (row: { alias: string; languageCode?: string | null }) =>
      `${row.alias}\u0000${row.languageCode ?? ''}`;
    const creatorKey = (row: EditorialMangaCreatorDto) =>
      `${row.creatorId}\u0000${row.contributionType}`;
    return (
      scalarChanged ||
      !this.sameSet(current.aliases.map(aliasKey), aliases.map(aliasKey)) ||
      !this.sameSet(
        current.genres.map(({ genreId }) => genreId),
        genreIds,
      ) ||
      !this.sameSet(current.creators.map(creatorKey), creators.map(creatorKey))
    );
  }

  private sameSet(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((value, index) => value === sortedRight[index]);
  }

  private assertNonAdult(contentRating: ContentRating): void {
    if (contentRating === ContentRating.ADULT) {
      throw editorialMangaAdultUnsupported();
    }
  }

  private async readResult(
    tx: TransactionClient,
    mangaId: string,
  ): Promise<EditorialMangaResponseDto> {
    const manga = await tx.manga.findUnique({
      where: { id: mangaId },
      select: editorialMangaDetailSelect,
    });
    if (!manga) throw editorialConflict();
    return { manga: this.mapper.toDetail(manga) };
  }

  private async runSerializable<T>(
    operation: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await runEditorialSerializableTransaction(this.prisma, operation);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
        throw error;
      }
      if (error.code === 'P2002') {
        const targetValue = error.meta?.target;
        const target = Array.isArray(targetValue)
          ? targetValue
              .filter((value): value is string => typeof value === 'string')
              .join(',')
          : typeof targetValue === 'string'
            ? targetValue
            : '';
        if (target.includes('slug')) throw editorialMangaSlugConflict();
        if (target.includes('normalizedAlias')) {
          throw editorialMangaInvalidMetadata();
        }
        throw editorialConflict();
      }
      throw error;
    }
  }
}
