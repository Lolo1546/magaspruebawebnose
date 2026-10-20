import type {
  ContentRating,
  MangaEditorialStatus,
  ProjectStatus,
  ScanlationGroupStatus,
} from '../../../generated/prisma/client.js';

export interface EditorialProjectDto {
  id: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  manga: {
    id: string;
    title: string;
    slug: string;
    editorialStatus: MangaEditorialStatus;
    contentRating: ContentRating;
  };
  groups: Array<{
    id: string;
    name: string;
    slug: string;
    status: ScanlationGroupStatus;
  }>;
}

export interface EditorialProjectListDto {
  items: EditorialProjectDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}
