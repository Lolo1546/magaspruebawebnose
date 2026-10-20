import type { ContentDeletionRequestStatus } from '../../../generated/prisma/client.js';
import type {
  CommunityPostCommentResponseDto,
  CommunityPostResponseDto,
} from './community-response.dto.js';

export interface CommunityPostMutationResponseDto {
  post: CommunityPostResponseDto;
}

export interface CommunityCommentMutationResponseDto {
  comment: CommunityPostCommentResponseDto;
}

export interface CommunityContentDeletionRequestResponseDto {
  deletionRequest: {
    id: string;
    targetType: 'POST' | 'POST_COMMENT';
    targetId: string;
    reason: string;
    details: string | null;
    status: ContentDeletionRequestStatus;
    createdAt: string;
  };
}
