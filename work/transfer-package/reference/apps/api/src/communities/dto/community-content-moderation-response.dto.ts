import type {
  ModerationActionType,
  PostCommentStatus,
  PostStatus,
} from '../../../generated/prisma/client.js';
import type { CommunityModerationContentType } from './community-content-moderation-query.dto.js';

export interface CommunityModerationAuthorDto {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface CommunityModerationCommunityDto {
  slug: string;
  name: string;
}

export interface CommunityModerationContextDto {
  postId: string;
  postTitle: string;
}

export interface CommunityModerationContentDto {
  id: string;
  type: CommunityModerationContentType;
  community: CommunityModerationCommunityDto;
  author: CommunityModerationAuthorDto;
  status: PostStatus | PostCommentStatus;
  title: string | null;
  body: string;
  context: CommunityModerationContextDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityModerationHistoryItemDto {
  action: ModerationActionType;
  reason: string;
  createdAt: string;
  actor: CommunityModerationAuthorDto | null;
}

export interface CommunityModerationListResponseDto {
  items: CommunityModerationContentDto[];
  communities: CommunityModerationCommunityDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface CommunityModerationDetailResponseDto {
  item: CommunityModerationContentDto;
  history: CommunityModerationHistoryItemDto[];
}
