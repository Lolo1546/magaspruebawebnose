import type { ScanlationGroupRequestStatus } from '../../../generated/prisma/client.js';
import type { ScanlationGroupPaginationDto } from './scanlation-group-response.dto.js';

export interface CreatedScanlationGroupSummaryDto {
  id: string;
  slug: string;
  name: string;
}

export interface LatestCreationRequestInfoDto {
  message: string;
  createdAt: string;
}

export interface SelfScanlationGroupCreationRequestDto {
  id: string;
  proposedName: string;
  description: string | null;
  language: string;
  website: string | null;
  status: ScanlationGroupRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  createdGroup: CreatedScanlationGroupSummaryDto | null;
  latestInfoRequest: LatestCreationRequestInfoDto | null;
}

export interface ScanlationGroupCreationRequestMutationResponseDto {
  request: SelfScanlationGroupCreationRequestDto;
}

export interface SelfScanlationGroupCreationRequestHistoryDto {
  items: SelfScanlationGroupCreationRequestDto[];
  pagination: ScanlationGroupPaginationDto;
}
