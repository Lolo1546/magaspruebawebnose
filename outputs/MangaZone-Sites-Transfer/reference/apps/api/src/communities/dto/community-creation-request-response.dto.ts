import type { CommunityRequestStatus } from '../../../generated/prisma/client.js';
import type { CommunityPaginationDto } from './community-response.dto.js';

export interface CommunityCreationRequestMangaDto {
  id: string;
  slug: string;
  title: string;
}

export interface CreatedCommunitySummaryDto {
  id: string;
  slug: string;
  name: string;
}

export interface LatestCreationRequestInfoDto {
  message: string;
  createdAt: string;
}

export interface SelfCommunityCreationRequestDto {
  id: string;
  proposedName: string;
  description: string | null;
  relatedManga: CommunityCreationRequestMangaDto | null;
  status: CommunityRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  createdCommunity: CreatedCommunitySummaryDto | null;
  latestInfoRequest: LatestCreationRequestInfoDto | null;
}

export interface CommunityCreationRequestMutationResponseDto {
  request: SelfCommunityCreationRequestDto;
}

export interface SelfCommunityCreationRequestHistoryDto {
  items: SelfCommunityCreationRequestDto[];
  pagination: CommunityPaginationDto;
}
