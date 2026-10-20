import type { CommunityRequestStatus } from '../../../generated/prisma/client.js';
import type { CommunityPaginationDto } from './community-response.dto.js';

export interface CommunityRequestModerationUserDto {
  id: string;
  username: string | null;
  displayName: string | null;
}

export interface CommunityRequestModerationMangaDto {
  id: string;
  slug: string;
  title: string;
}

export interface CommunityRequestModerationCreatedCommunityDto {
  id: string;
  slug: string;
  name: string;
}

export interface CommunityCreationRequestModerationDto {
  id: string;
  proposedName: string;
  description: string | null;
  relatedManga: CommunityRequestModerationMangaDto | null;
  status: CommunityRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdCommunity: CommunityRequestModerationCreatedCommunityDto | null;
  requester: CommunityRequestModerationUserDto;
}

export interface CommunityCreationRequestModerationListDto {
  items: CommunityCreationRequestModerationDto[];
  pagination: CommunityPaginationDto;
}

export interface CommunityCreationRequestModerationResponseDto {
  request: CommunityCreationRequestModerationDto;
}
