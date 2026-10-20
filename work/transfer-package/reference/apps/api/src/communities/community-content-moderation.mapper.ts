import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetStatus, Prisma } from '../../generated/prisma/client.js';
import { resolveReaderAssetUrl } from '../manga/utils/reader-asset.utils.js';
import { CommunityModerationContentType } from './dto/community-content-moderation-query.dto.js';
import type {
  CommunityModerationContentDto,
  CommunityModerationHistoryItemDto,
} from './dto/community-content-moderation-response.dto.js';

const safeAuthorSelect = {
  username: true,
  profile: {
    select: {
      displayName: true,
      avatarAsset: { select: { status: true, storageKey: true } },
    },
  },
} satisfies Prisma.UserSelect;

export const communityModerationPostSelect = {
  id: true,
  title: true,
  body: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  community: { select: { slug: true, name: true } },
  author: { select: safeAuthorSelect },
} satisfies Prisma.PostSelect;

export const communityModerationCommentSelect = {
  id: true,
  body: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  author: { select: safeAuthorSelect },
  post: {
    select: {
      id: true,
      title: true,
      community: { select: { slug: true, name: true } },
    },
  },
} satisfies Prisma.PostCommentSelect;

export const communityModerationHistorySelect = {
  actionType: true,
  reason: true,
  createdAt: true,
  moderator: { select: safeAuthorSelect },
} satisfies Prisma.ModerationActionSelect;

export type CommunityModerationPostProjection = Prisma.PostGetPayload<{
  select: typeof communityModerationPostSelect;
}>;
export type CommunityModerationCommentProjection =
  Prisma.PostCommentGetPayload<{
    select: typeof communityModerationCommentSelect;
  }>;
export type CommunityModerationHistoryProjection =
  Prisma.ModerationActionGetPayload<{
    select: typeof communityModerationHistorySelect;
  }>;

type SafeAuthorProjection = CommunityModerationPostProjection['author'];

@Injectable()
export class CommunityContentModerationMapper {
  constructor(private readonly configService: ConfigService) {}

  private avatarUrl(author: SafeAuthorProjection): string | null {
    const asset = author.profile?.avatarAsset;
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

  private author(author: SafeAuthorProjection) {
    return {
      username: author.username,
      displayName: author.profile?.displayName ?? null,
      avatarUrl: this.avatarUrl(author),
    };
  }

  post(post: CommunityModerationPostProjection): CommunityModerationContentDto {
    return {
      id: post.id,
      type: CommunityModerationContentType.POST,
      community: post.community,
      author: this.author(post.author),
      status: post.status,
      title: post.title,
      body: post.body,
      context: null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  comment(
    comment: CommunityModerationCommentProjection,
  ): CommunityModerationContentDto {
    return {
      id: comment.id,
      type: CommunityModerationContentType.COMMENT,
      community: comment.post.community,
      author: this.author(comment.author),
      status: comment.status,
      title: null,
      body: comment.body,
      context: { postId: comment.post.id, postTitle: comment.post.title },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  history(
    action: CommunityModerationHistoryProjection,
  ): CommunityModerationHistoryItemDto {
    return {
      action: action.actionType,
      reason: action.reason,
      createdAt: action.createdAt.toISOString(),
      actor: action.moderator ? this.author(action.moderator) : null,
    };
  }
}
