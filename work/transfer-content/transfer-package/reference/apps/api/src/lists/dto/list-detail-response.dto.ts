import { ListResponseDto, ListPreviewMangaDto } from './list-response.dto.js';

export interface ListDetailPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface ListItemDto {
  manga: ListPreviewMangaDto;
  addedAt: string;
}

export interface ListDetailResponseDto extends Omit<
  ListResponseDto,
  'previewItems'
> {
  items: ListItemDto[];
  pagination: ListDetailPaginationDto;
}
