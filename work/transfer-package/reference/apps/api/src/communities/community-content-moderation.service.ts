import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityStatus,
  ModerationActionType,
  ModerationTargetType,
  PostCommentStatus,
  PostStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { evaluateCommunityAuthority } from './community-authorization.service.js';
import {
  communityModerationCommentSelect,
  communityModerationHistorySelect,
  communityModerationPostSelect,
  CommunityContentModerationMapper,
} from './community-content-moderation.mapper.js';
import {
  CommunityModerationContentType,
  type CommunityContentModerationQueryDto,
} from './dto/community-content-moderation-query.dto.js';
import type {
  CommunityModerationDetailResponseDto,
  CommunityModerationListResponseDto,
} from './dto/community-content-moderation-response.dto.js';

type OrderedContentKey = {
  id: string;
  contentType: CommunityModerationContentType;
};

type ModerationScopeCommunity = {
  id: string;
  slug: string;
  name: string;
};

function moderationContentNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_MODERATION_CONTENT_NOT_FOUND',
    message: 'Contenido no encontrado.',
  });
}

@Injectable()
export class CommunityContentModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CommunityContentModerationMapper,
  ) {}

  private async resolveScope(
    actorUserId: string,
  ): Promise<ModerationScopeCommunity[]> {
    const candidates = await this.prisma.community.findMany({
      where: {
        status: CommunityStatus.ACTIVE,
        OR: [
          { ownerUserId: actorUserId },
          {
            members: {
              some: {
                userId: actorUserId,
                status: CommunityMemberStatus.ACTIVE,
                leftAt: null,
                role: {
                  in: [
                    CommunityMemberRole.ADMIN,
                    CommunityMemberRole.MODERATOR,
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        ownerUserId: true,
        members: {
          where: {
            status: CommunityMemberStatus.ACTIVE,
            leftAt: null,
            OR: [{ userId: actorUserId }, { role: CommunityMemberRole.OWNER }],
          },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            leftAt: true,
          },
        },
      },
    });

    return candidates
      .filter(
        (community) =>
          evaluateCommunityAuthority(
            community.ownerUserId,
            community.members,
            actorUserId,
          ).canModerateContent,
      )
      .map(({ id, slug, name }) => ({ id, slug, name }));
  }

  async list(
    query: CommunityContentModerationQueryDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityModerationListResponseDto> {
    const scope = await this.resolveScope(auth.userId);
    const selectedScope = query.community
      ? scope.filter((community) => community.slug === query.community)
      : scope;
    const communityIds = selectedScope.map(({ id }) => id);
    if (communityIds.length === 0) {
      return {
        items: [],
        communities: scope.map(({ slug, name }) => ({ slug, name })),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: 0,
          pageCount: 1,
        },
      };
    }

    const includePosts =
      query.type === undefined ||
      query.type === CommunityModerationContentType.POST;
    const includeComments =
      query.type === undefined ||
      query.type === CommunityModerationContentType.COMMENT;
    const postWhere: Prisma.PostWhereInput = {
      communityId: { in: communityIds },
      status: PostStatus.HIDDEN,
    };
    const commentWhere: Prisma.PostCommentWhereInput = {
      post: { communityId: { in: communityIds } },
      status: PostCommentStatus.HIDDEN,
    };
    const [postTotal, commentTotal] = await Promise.all([
      includePosts ? this.prisma.post.count({ where: postWhere }) : 0,
      includeComments
        ? this.prisma.postComment.count({ where: commentWhere })
        : 0,
    ]);
    const total = postTotal + commentTotal;
    const uuidList = Prisma.join(
      communityIds.map((id) => Prisma.sql`${id}::uuid`),
    );
    const branches: Prisma.Sql[] = [];
    if (includePosts) {
      branches.push(Prisma.sql`
        SELECT p.id, 'POST'::text AS "contentType", p."updatedAt"
        FROM "Post" p
        WHERE p.status = 'HIDDEN'::"PostStatus"
          AND p."communityId" IN (${uuidList})
      `);
    }
    if (includeComments) {
      branches.push(Prisma.sql`
        SELECT c.id, 'COMMENT'::text AS "contentType", c."updatedAt"
        FROM "PostComment" c
        INNER JOIN "Post" p ON p.id = c."postId"
        WHERE c.status = 'HIDDEN'::"PostCommentStatus"
          AND p."communityId" IN (${uuidList})
      `);
    }
    const offset = (query.page - 1) * query.pageSize;
    const keys = await this.prisma.$queryRaw<OrderedContentKey[]>(Prisma.sql`
      SELECT ranked.id, ranked."contentType"
      FROM (${Prisma.join(branches, ' UNION ALL ')}) ranked
      ORDER BY ranked."updatedAt" DESC, ranked.id DESC
      LIMIT ${query.pageSize} OFFSET ${offset}
    `);
    const postIds = keys
      .filter(
        ({ contentType }) =>
          contentType === CommunityModerationContentType.POST,
      )
      .map(({ id }) => id);
    const commentIds = keys
      .filter(
        ({ contentType }) =>
          contentType === CommunityModerationContentType.COMMENT,
      )
      .map(({ id }) => id);
    const [posts, comments] = await Promise.all([
      this.prisma.post.findMany({
        where: { id: { in: postIds }, ...postWhere },
        select: communityModerationPostSelect,
      }),
      this.prisma.postComment.findMany({
        where: { id: { in: commentIds }, ...commentWhere },
        select: communityModerationCommentSelect,
      }),
    ]);
    const mapped = new Map([
      ...posts.map(
        (post) =>
          [
            `${CommunityModerationContentType.POST}:${post.id}`,
            this.mapper.post(post),
          ] as const,
      ),
      ...comments.map(
        (comment) =>
          [
            `${CommunityModerationContentType.COMMENT}:${comment.id}`,
            this.mapper.comment(comment),
          ] as const,
      ),
    ]);

    return {
      items: keys.flatMap((key) => {
        const item = mapped.get(`${key.contentType}:${key.id}`);
        return item ? [item] : [];
      }),
      communities: scope.map(({ slug, name }) => ({ slug, name })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async detail(
    type: CommunityModerationContentType,
    id: string,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityModerationDetailResponseDto> {
    const scopeIds = (await this.resolveScope(auth.userId)).map(({ id }) => id);
    if (scopeIds.length === 0) throw moderationContentNotFound();

    const item =
      type === CommunityModerationContentType.POST
        ? await this.prisma.post
            .findFirst({
              where: {
                id,
                status: PostStatus.HIDDEN,
                communityId: { in: scopeIds },
              },
              select: communityModerationPostSelect,
            })
            .then((post) => (post ? this.mapper.post(post) : null))
        : await this.prisma.postComment
            .findFirst({
              where: {
                id,
                status: PostCommentStatus.HIDDEN,
                post: { communityId: { in: scopeIds } },
              },
              select: communityModerationCommentSelect,
            })
            .then((comment) => (comment ? this.mapper.comment(comment) : null));
    if (!item) throw moderationContentNotFound();

    const targetType =
      type === CommunityModerationContentType.POST
        ? ModerationTargetType.POST
        : ModerationTargetType.POST_COMMENT;
    const history = await this.prisma.moderationAction.findMany({
      where: {
        targetType,
        targetId: id,
        actionType: {
          in: [
            ModerationActionType.HIDE_CONTENT,
            ModerationActionType.RESTORE_CONTENT,
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: communityModerationHistorySelect,
    });
    return {
      item,
      history: history.map((action) => this.mapper.history(action)),
    };
  }
}
