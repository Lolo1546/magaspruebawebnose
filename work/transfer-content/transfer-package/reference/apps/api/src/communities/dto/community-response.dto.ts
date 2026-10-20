import { CommunityStatus } from '../../../generated/prisma/client.js';

export interface CommunityPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface CommunityRelatedMangaDto {
  id: string;
  slug: string;
  title: string;
}

export interface CommunityIndexItemDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: CommunityStatus;
  avatarUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  memberCount: number;
  postCount: number;
  relatedManga: CommunityRelatedMangaDto | null;
}

export interface CommunityIndexResponseDto {
  items: CommunityIndexItemDto[];
  pagination: CommunityPaginationDto;
}

export interface CommunityDetailResponseDto extends CommunityIndexItemDto {
  updatedAt: string;
}

export interface CommunityPostAuthorDto {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface CommunityPostResponseDto {
  id: string;
  title: string;
  body: string;
  isSpoiler: boolean;
  spoilerChapterId: string | null;
  spoilerLabel: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommunityPostAuthorDto;
  commentCount: number;
}

export interface CommunityPostsResponseDto {
  items: CommunityPostResponseDto[];
  pagination: CommunityPaginationDto;
}

export interface CommunityPostCommunityDto {
  id: string;
  slug: string;
  name: string;
}

export interface CommunityFeedPostResponseDto extends CommunityPostResponseDto {
  community: CommunityPostCommunityDto;
}

export interface CommunityFeedResponseDto {
  items: CommunityFeedPostResponseDto[];
  pagination: CommunityPaginationDto;
}

export interface CommunityPostCommentResponseDto {
  id: string;
  body: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommunityPostAuthorDto;
}

export interface CommunityPostCommentsResponseDto {
  items: CommunityPostCommentResponseDto[];
  pagination: CommunityPaginationDto;
}
