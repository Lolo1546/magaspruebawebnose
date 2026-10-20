import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunityMemberStatus,
  CommunityStatus,
  PostCommentStatus,
  PostStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommunityQueryDto, CommunitySort } from './dto/community-query.dto.js';
import type {
  CommunityDetailResponseDto,
  CommunityFeedResponseDto,
  CommunityIndexResponseDto,
  CommunityPostCommentsResponseDto,
  CommunityPostsResponseDto,
} from './dto/community-response.dto.js';
import {
  CommunityPostCommentsQueryDto,
  CommunityPostsQueryDto,
} from './dto/community-posts-query.dto.js';
import {
  CommunitiesMapper,
  PUBLIC_FEED_POST_SELECT,
  PUBLIC_POST_COMMENT_SELECT,
  PUBLIC_POST_SELECT,
} from './communities.mapper.js';

export const PUBLIC_COMMUNITY_WHERE = {
  status: CommunityStatus.ACTIVE,
} satisfies Prisma.CommunityWhereInput;

export const PUBLIC_POST_WHERE = {
  status: PostStatus.PUBLISHED,
} satisfies Prisma.PostWhereInput;

const publicCommunityInclude = {
  avatarAsset: true,
  bannerAsset: true,
  relatedManga: { select: { id: true, slug: true, title: true } },
  _count: {
    select: {
      members: {
        where: { status: CommunityMemberStatus.ACTIVE, leftAt: null },
      },
      posts: { where: PUBLIC_POST_WHERE },
    },
  },
} satisfies Prisma.CommunityInclude;

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CommunitiesMapper,
  ) {}

  async getPublicCommunities(
    query: CommunityQueryDto,
  ): Promise<CommunityIndexResponseDto> {
    const where: Prisma.CommunityWhereInput = {
      ...PUBLIC_COMMUNITY_WHERE,
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { nameNormalized: { contains: query.q.toUpperCase() } },
        ],
      }),
    };
    const orderBy: Prisma.CommunityOrderByWithRelationInput[] =
      query.sort === CommunitySort.RECENT
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ nameNormalized: 'asc' }, { id: 'asc' }];

    const [total, communities] = await this.prisma.$transaction([
      this.prisma.community.count({ where }),
      this.prisma.community.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: publicCommunityInclude,
      }),
    ]);

    return {
      items: communities.map((community) => this.mapper.toIndexItem(community)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async getPublicCommunityBySlug(
    slug: string,
  ): Promise<CommunityDetailResponseDto> {
    const community = await this.prisma.community.findFirst({
      where: { ...PUBLIC_COMMUNITY_WHERE, slug },
      include: publicCommunityInclude,
    });

    if (!community) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    return this.mapper.toDetail(community);
  }

  async getPublicCommunityPosts(
    slug: string,
    query: CommunityPostsQueryDto,
  ): Promise<CommunityPostsResponseDto> {
    const community = await this.prisma.community.findFirst({
      where: { ...PUBLIC_COMMUNITY_WHERE, slug },
      select: { id: true },
    });

    if (!community) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    const where: Prisma.PostWhereInput = {
      ...PUBLIC_POST_WHERE,
      communityId: community.id,
    };
    const [total, posts] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: PUBLIC_POST_SELECT,
      }),
    ]);

    return {
      items: posts.map((post) => this.mapper.toPost(post)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async getPublicCommunityFeed(
    query: CommunityPostsQueryDto,
  ): Promise<CommunityFeedResponseDto> {
    const where: Prisma.PostWhereInput = {
      ...PUBLIC_POST_WHERE,
      community: PUBLIC_COMMUNITY_WHERE,
    };
    const [total, posts] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: PUBLIC_FEED_POST_SELECT,
      }),
    ]);

    return {
      items: posts.map((post) => this.mapper.toFeedPost(post)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async getPublicPostComments(
    postId: string,
    query: CommunityPostCommentsQueryDto,
  ): Promise<CommunityPostCommentsResponseDto> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        ...PUBLIC_POST_WHERE,
        community: PUBLIC_COMMUNITY_WHERE,
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Publicación no encontrada');
    }

    const where: Prisma.PostCommentWhereInput = {
      postId,
      status: PostCommentStatus.PUBLISHED,
    };
    const [total, comments] = await this.prisma.$transaction([
      this.prisma.postComment.count({ where }),
      this.prisma.postComment.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: PUBLIC_POST_COMMENT_SELECT,
      }),
    ]);

    return {
      items: comments.map((comment) => this.mapper.toComment(comment, postId)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }
}
