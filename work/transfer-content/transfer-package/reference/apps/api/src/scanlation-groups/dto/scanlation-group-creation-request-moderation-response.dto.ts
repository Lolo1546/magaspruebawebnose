import type { ScanlationGroupRequestStatus } from '../../../generated/prisma/client.js';
import type { ScanlationGroupPaginationDto } from './scanlation-group-response.dto.js';

export interface ScanlationGroupRequestModerationUserDto {
  id: string;
  username: string | null;
  displayName: string | null;
}

export interface ScanlationGroupRequestModerationCreatedGroupDto {
  id: string;
  slug: string;
  name: string;
}

export interface ScanlationGroupCreationRequestModerationDto {
  id: string;
  proposedName: string;
  description: string | null;
  language: string;
  website: string | null;
  status: ScanlationGroupRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdGroup: ScanlationGroupRequestModerationCreatedGroupDto | null;
  requester: ScanlationGroupRequestModerationUserDto;
}

export interface ScanlationGroupCreationRequestModerationListDto {
  items: ScanlationGroupCreationRequestModerationDto[];
  pagination: ScanlationGroupPaginationDto;
}

export interface ScanlationGroupCreationRequestModerationResponseDto {
  request: ScanlationGroupCreationRequestModerationDto;
}
