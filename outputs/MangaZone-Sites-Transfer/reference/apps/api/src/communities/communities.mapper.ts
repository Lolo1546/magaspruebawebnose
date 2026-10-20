import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetStatus,
  PostCommentStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { resolveReaderAssetUrl } from '../manga/utils/reader-asset.utils.js';
import type {
  CommunityDetailResponseDto,
  CommunityFeedPostResponseDto,
  CommunityIndexItemDto,
  CommunityPostCommentResponseDto,
  CommunityPostResponseDto,
} from './dto/community-response.dto.js';

export const PUBLIC_POST_SELECT = {
  id: true,
  title: true,
  body: true,
  isSpoiler: true,
  spoilerChapterId: true,
  spoilerLabel: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      username: true,
      profile: {
        select: {
          displayName: true,
          avatarAsset: { select: { status: true, storageKey: true } },
        },
      },
    },
  },
  _count: {
    select: {
      comments: { where: { status: PostCommentStatus.PUBLISHED } },
    },
  },
} satisfies Prisma.PostSelect;

export const PUBLIC_FEED_POST_SELECT = {
  ...PUBLIC_POST_SELECT,
  community: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.PostSelect;

export const PUBLIC_POST_COMMENT_SELECT = {
  id: true,
  body: true,
  parentCommentId: true,
  createdAt: true,
  updatedAt: true,
  author: PUBLIC_POST_SELECT.author,
  parent: { select: { id: true, postId: true, status: true } },
} satisfies Prisma.PostCommentSelect;

export type PublicCommunityQueryResult = Prisma.CommunityGetPayload<{
  include: {
    avatarAsset: true;
    bannerAsset: true;
    relatedManga: { select: { id: true; slug: true; title: true } };
    _count: { select: { members: true; posts: true } };
  };
}>;

export type PublicCommunityPostQueryResult = Prisma.PostGetPayload<{
  select: typeof PUBLIC_POST_SELECT;
}>;

export type PublicCommunityFeedPostQueryResult = Prisma.PostGetPayload<{
  select: typeof PUBLIC_FEED_POST_SELECT;
}>;

export type PublicPostCommentQueryResult = Prisma.PostCommentGetPayload<{
  select: typeof PUBLIC_POST_COMMENT_SELECT;
}>;

type PublicAsset = {
  status: AssetStatus;
  storageKey: string;
} | null;

@Injectable()
export class CommunitiesMapper {
  constructor(private readonly configService: ConfigService) {}

  private mapAsset(asset: PublicAsset): string | null {
    if (!asset || asset.status !== AssetStatus.READY) return null;

    return resolveReaderAssetUrl(asset.storageKey, {
      objectStorageBucket: this.configService.get<string>(
        'OBJECT_STORAGE_BUCKET',
      ),
      objectStorageEndpoint: this.configService.get<string>(
        'OBJECT_STORAGE_ENDPOINT',
      ),
    });
  }

  toIndexItem(community: PublicCommunityQueryResult): CommunityIndexItemDto {
    return {
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      status: community.status,
      avatarUrl: this.mapAsset(community.avatarAsset),
      bannerUrl: this.mapAsset(community.bannerAsset),
      createdAt: community.createdAt.toISOString(),
      memberCount: community._count.members,
      postCount: community._count.posts,
      relatedManga: community.relatedManga
        ? {
            id: community.relatedManga.id,
            slug: community.relatedManga.slug,
            title: community.relatedManga.title,
          }
        : null,
    };
  }

  toDetail(community: PublicCommunityQueryResult): CommunityDetailResponseDto {
    return {
      ...this.toIndexItem(community),
      updatedAt: community.updatedAt.toISOString(),
    };
  }

  toPost(post: PublicCommunityPostQueryResult): CommunityPostResponseDto {
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      isSpoiler: post.isSpoiler,
      spoilerChapterId: post.spoilerChapterId,
      spoilerLabel: post.spoilerLabel,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: {
        username: post.author.username,
        displayName: post.author.profile?.displayName ?? null,
        avatarUrl: this.mapAsset(post.author.profile?.avatarAsset ?? null),
      },
      commentCount: post._count.comments,
    };
  }

  toFeedPost(
    post: PublicCommunityFeedPostQueryResult,
  ): CommunityFeedPostResponseDto {
    return {
      ...this.toPost(post),
      community: {
        id: post.community.id,
        slug: post.community.slug,
        name: post.community.name,
      },
    };
  }

  toComment(
    comment: PublicPostCommentQueryResult,
    requestedPostId: string,
  ): CommunityPostCommentResponseDto {
    const publicParent =
      comment.parent?.postId === requestedPostId &&
      comment.parent.status === PostCommentStatus.PUBLISHED
        ? comment.parent.id
        : null;

    return {
      id: comment.id,
      body: comment.body,
      parentCommentId: publicParent,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        username: comment.author.username,
        displayName: comment.author.profile?.displayName ?? null,
        avatarUrl: this.mapAsset(comment.author.profile?.avatarAsset ?? null),
      },
    };
  }
}
