import { ListVisibility } from '../../../generated/prisma/client.js';

export interface ListPreviewMangaDto {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
}

export interface ListResponseDto {
  id: string;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  containsManga: boolean;
  previewItems: ListPreviewMangaDto[];
}
