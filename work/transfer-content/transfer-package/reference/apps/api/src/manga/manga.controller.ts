import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaCatalogQueryDto } from './dto/manga-catalog-query.dto.js';
import { MangaCatalogResponseDto } from './dto/manga-catalog-response.dto.js';
import { MangaDetailResponseDto } from './dto/manga-detail-response.dto.js';
import { ChapterIndexQueryDto } from './dto/chapter-index-query.dto.js';
import { ChapterIndexResponseDto } from './dto/chapter-index-response.dto.js';
import { ReaderQueryDto } from './dto/reader-query.dto.js';
import { ReaderResponseDto } from './dto/reader-response.dto.js';

@Controller('manga')
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCatalog(
    @Query() query: MangaCatalogQueryDto,
  ): Promise<MangaCatalogResponseDto> {
    return this.mangaService.getCatalog(query);
  }

  @Get(':slug')
  async getMangaBySlug(
    @Param('slug') slug: string,
  ): Promise<MangaDetailResponseDto> {
    return this.mangaService.getMangaBySlug(slug);
  }

  @Get(':slug/chapters')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getChapterIndex(
    @Param('slug') slug: string,
    @Query() query: ChapterIndexQueryDto,
  ): Promise<ChapterIndexResponseDto> {
    return this.mangaService.getChapterIndex(slug, query);
  }

  @Get(':slug/chapters/:chapterKey/reader')
  async getReaderData(
    @Param('slug') slug: string,
    @Param('chapterKey') chapterKey: string,
    @Query() query: ReaderQueryDto,
  ): Promise<ReaderResponseDto> {
    return this.mangaService.getReaderData(slug, chapterKey, query.release);
  }
}
