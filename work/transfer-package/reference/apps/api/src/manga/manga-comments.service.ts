import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GlobalAuthorizationService } from '../authorization/global-authorization.service.js';
import { GLOBAL_PERMISSIONS } from '../authorization/global-permissions.js';
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import type {
  CreateMangaCommentDto,
  EditMangaCommentDto,
  MangaCommentQueryDto,
} from './dto/manga-comment.dto.js';
import { publicMangaWhere } from './utils/public-manga.utils.js';
import {
  decodeCommentCursor,
  encodeCommentCursor,
  type CommentCursorScope,
} from './manga-comments.cursor.js';
import {
  commentAuthorForbidden,
  commentConflict,
  commentNoChanges,
  commentNotFound,
  commentParentInvalid,
  commentStateConflict,
} from './manga-comments.errors.js';
import {
  MangaCommentsMapper,
  mangaCommentSelect,
  type CommentData,
  type CommentPageInfo,
} from './manga-comments.mapper.js';

type RawReply = Omit<CommentData, 'author'> & {
  username: string | null;
  displayName: string | null;
  avatarStatus: string | null;
  avatarKey: string | null;
};

@Injectable()
export class MangaCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: MangaCommentsMapper,
    private readonly authorization: GlobalAuthorizationService,
  ) {}

  private async publicManga(
    where: Prisma.MangaWhereInput,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const manga = await client.manga.findFirst({
      where: { ...where, ...publicMangaWhere },
      select: { id: true },
    });
    if (!manga) throw new NotFoundException('Manga no disponible.');
    return manga;
  }

  private boundary(
    cursor: string | undefined,
    scope: CommentCursorScope,
    asc: boolean,
  ): Prisma.MangaCommentWhereInput {
    const position = decodeCommentCursor(cursor, scope);
    if (!position) return {};
    return {
      OR: [
        {
          createdAt: asc
            ? { gt: position.createdAt }
            : { lt: position.createdAt },
        },
        {
          createdAt: position.createdAt,
          id: asc ? { gt: position.id } : { lt: position.id },
        },
      ],
    };
  }

  private page(rows: CommentData[], limit: number, scope: CommentCursorScope) {
    const visible = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = visible.at(-1);
    const pageInfo: CommentPageInfo = {
      hasMore,
      nextCursor: hasMore && last ? encodeCommentCursor(scope, last) : null,
    };
    return { items: visible.map((row) => this.mapper.public(row)), pageInfo };
  }

  async list(slug: string, query: MangaCommentQueryDto) {
    const manga = await this.publicManga({ slug });
    const scope = { mangaId: manga.id, parentCommentId: null };
    const roots = await this.prisma.mangaComment.findMany({
      where: {
        mangaId: manga.id,
        parentCommentId: null,
        ...this.boundary(query.cursor, scope, false),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.pageSize + 1,
      select: mangaCommentSelect,
    });
    const result = this.page(roots, query.pageSize, scope);
    const rootIds = result.items.map((row) => row.id);
    // One bounded lateral batch, never one application query per root.
    const replyRows = rootIds.length
      ? await this.prisma.$queryRaw<RawReply[]>(Prisma.sql`
      SELECT c."id", c."parentCommentId", c."body", c."status", c."isSpoiler", c."createdAt", c."updatedAt", c."editedAt",
        u."username", p."displayName", a."status"::text AS "avatarStatus", a."storageKey" AS "avatarKey"
      FROM unnest(ARRAY[${Prisma.join(rootIds.map((id) => Prisma.sql`${id}::uuid`))}]) AS root("id")
      CROSS JOIN LATERAL (
        SELECT * FROM "MangaComment" r WHERE r."parentCommentId" = root."id" AND r."mangaId" = ${manga.id}::uuid
        ORDER BY r."createdAt" ASC, r."id" ASC LIMIT 6
      ) c
      JOIN "User" u ON u."id" = c."authorUserId"
      LEFT JOIN "Profile" p ON p."userId" = u."id"
      LEFT JOIN "Asset" a ON a."id" = p."avatarAssetId"
      ORDER BY c."createdAt" ASC, c."id" ASC
    `)
      : [];
    const replies = new Map<string, CommentData[]>();
    for (const row of replyRows) {
      if (!row.parentCommentId) continue;
      const data: CommentData = {
        id: row.id,
        body: row.body,
        parentCommentId: row.parentCommentId,
        status: row.status,
        isSpoiler: row.isSpoiler,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        editedAt: row.editedAt,
        author: {
          username: row.username,
          profile: {
            displayName: row.displayName,
            avatarAsset:
              row.avatarKey && row.avatarStatus === 'READY'
                ? { status: 'READY', storageKey: row.avatarKey }
                : null,
          },
        },
      };
      const group = replies.get(row.parentCommentId) ?? [];
      group.push(data);
      replies.set(row.parentCommentId, group);
    }
    const totalPublished = await this.prisma.mangaComment.count({
      where: { mangaId: manga.id, status: 'PUBLISHED' },
    });
    return {
      items: result.items.map((root) => {
        const nested = this.page(replies.get(root.id) ?? [], 5, {
          mangaId: manga.id,
          parentCommentId: root.id,
        });
        return {
          ...root,
          replies: nested.items,
          repliesPageInfo: nested.pageInfo,
        };
      }),
      pageInfo: result.pageInfo,
      totalPublished,
    };
  }

  async replies(commentId: string, query: MangaCommentQueryDto) {
    const root = await this.prisma.mangaComment.findFirst({
      where: { id: commentId, parentCommentId: null, manga: publicMangaWhere },
      select: { mangaId: true },
    });
    if (!root) throw commentNotFound();
    const scope = { mangaId: root.mangaId, parentCommentId: commentId };
    const rows = await this.prisma.mangaComment.findMany({
      where: {
        mangaId: root.mangaId,
        parentCommentId: commentId,
        ...this.boundary(query.cursor, scope, true),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.pageSize + 1,
      select: mangaCommentSelect,
    });
    return this.page(rows, query.pageSize, scope);
  }

  async access(auth: AuthenticatedRequestContext) {
    const canParticipate = auth.userStatus === UserStatus.ACTIVE;
    return {
      canParticipate,
      canModerate:
        canParticipate &&
        (await this.authorization.hasPermission(
          auth.userId,
          GLOBAL_PERMISSIONS.MODERATE_MANGA_COMMENTS,
        )),
    };
  }

  async ownership(
    slug: string,
    ids: string[],
    auth: AuthenticatedRequestContext,
  ) {
    const manga = await this.publicManga({ slug });
    const owned = await this.prisma.mangaComment.findMany({
      where: { mangaId: manga.id, id: { in: ids }, authorUserId: auth.userId },
      select: { id: true },
      take: 300,
    });
    return { ownedCommentIds: owned.map(({ id }) => id) };
  }

  private async lockManga(tx: Prisma.TransactionClient, mangaId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Manga" WHERE "id" = ${mangaId}::uuid FOR SHARE`;
    await this.publicManga({ id: mangaId }, tx);
  }

  private async lockComment(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "MangaComment" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const row = await tx.mangaComment.findUnique({ where: { id } });
    if (!row) throw commentNotFound();
    return row;
  }

  async create(
    slug: string,
    dto: CreateMangaCommentDto,
    auth: AuthenticatedRequestContext,
  ) {
    const actor = assertActiveMutationActor(auth);
    return this.prisma.$transaction(
      async (tx) => {
        const manga = await this.publicManga({ slug }, tx);
        await this.lockManga(tx, manga.id);
        if (dto.parentCommentId) {
          const parent = await this.lockComment(tx, dto.parentCommentId);
          if (
            parent.mangaId !== manga.id ||
            parent.parentCommentId !== null ||
            parent.status !== 'PUBLISHED'
          )
            throw commentParentInvalid();
        }
        const row = await tx.mangaComment.create({
          data: {
            mangaId: manga.id,
            authorUserId: actor,
            parentCommentId: dto.parentCommentId ?? null,
            body: dto.body,
            isSpoiler: dto.isSpoiler ?? false,
            status: 'PUBLISHED',
          },
          select: mangaCommentSelect,
        });
        return { comment: this.mapper.public(row) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async mutate(
    commentId: string,
    command: 'edit' | 'remove' | 'hide' | 'unhide',
    dto: EditMangaCommentDto & { reason?: string },
    auth: AuthenticatedRequestContext,
  ) {
    const actor = assertActiveMutationActor(auth);
    if (command === 'hide' || command === 'unhide')
      await this.authorization.assertPermission(
        actor,
        GLOBAL_PERMISSIONS.MODERATE_MANGA_COMMENTS,
      );
    return this.prisma.$transaction(
      async (tx) => {
        const context = await tx.mangaComment.findUnique({
          where: { id: commentId },
          select: { mangaId: true },
        });
        if (!context) throw commentNotFound();
        await this.lockManga(tx, context.mangaId);
        const current = await this.lockComment(tx, commentId);
        const ownerCommand = command === 'edit' || command === 'remove';
        if (ownerCommand && current.authorUserId !== actor)
          throw commentAuthorForbidden();
        const allowed =
          command === 'remove'
            ? current.status !== 'REMOVED'
            : command === 'unhide'
              ? current.status === 'HIDDEN'
              : current.status === 'PUBLISHED';
        if (!allowed) throw commentStateConflict();
        const data: Prisma.MangaCommentUpdateManyMutationInput = {};
        if (command === 'edit') {
          const edit = dto;
          if (
            (edit.body === undefined || edit.body === current.body) &&
            (edit.isSpoiler === undefined ||
              edit.isSpoiler === current.isSpoiler)
          )
            throw commentNoChanges();
          data.body = edit.body;
          data.isSpoiler = edit.isSpoiler;
          data.editedAt = new Date();
        } else {
          data.status =
            command === 'remove'
              ? 'REMOVED'
              : command === 'hide'
                ? 'HIDDEN'
                : 'PUBLISHED';
          if (command === 'remove') data.deletedAt = new Date();
        }
        const result = await tx.mangaComment.updateMany({
          where: {
            id: commentId,
            status: current.status,
            updatedAt: current.updatedAt,
            ...(ownerCommand ? { authorUserId: actor } : {}),
          },
          data,
        });
        if (result.count !== 1) throw commentConflict();
        if (!ownerCommand) {
          if (dto.reason === undefined) throw commentConflict();
          await tx.moderationAction.create({
            data: {
              targetType: 'MANGA_COMMENT',
              targetId: commentId,
              moderatorUserId: actor,
              actionType:
                command === 'hide' ? 'HIDE_CONTENT' : 'RESTORE_CONTENT',
              reason: dto.reason,
            },
          });
        }
        const row = await tx.mangaComment.findUniqueOrThrow({
          where: { id: commentId },
          select: mangaCommentSelect,
        });
        return { comment: this.mapper.public(row) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
