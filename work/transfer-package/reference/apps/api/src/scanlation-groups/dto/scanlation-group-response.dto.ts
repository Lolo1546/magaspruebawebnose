import { ScanlationGroupStatus } from '../../../generated/prisma/client.js';

export interface ScanlationGroupCountsDto {
  memberCount: number;
  releaseCount: number;
  projectCount: number;
}

export interface ScanlationGroupIndexItemDto extends ScanlationGroupCountsDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  language: string;
  website: string | null;
  status: ScanlationGroupStatus;
  verified: boolean;
  verifiedAt: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
}

export interface ScanlationGroupPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface ScanlationGroupIndexResponseDto {
  items: ScanlationGroupIndexItemDto[];
  pagination: ScanlationGroupPaginationDto;
}

export interface ScanlationGroupDetailResponseDto extends ScanlationGroupIndexItemDto {
  updatedAt: string;
}
