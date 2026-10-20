import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { EditorialChaptersService } from './editorial-chapters.service.js';
import {
  CreateEditorialChapterDto,
  CreateEditorialReleaseDto,
  EditorialChapterProjectParamsDto,
  EditorialChapterParamsDto,
  EditorialReleaseParamsDto,
} from './dto/editorial-chapter.dto.js';
import { EditorialProjectQueryDto } from './dto/editorial-project-query.dto.js';

@Controller('editorial/projects/:projectId/chapters')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialChaptersController {
  constructor(private readonly chapters: EditorialChaptersService) {}

  @Post()
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  create(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialChapterProjectParamsDto,
    @Body() dto: CreateEditorialChapterDto,
  ) {
    return this.chapters.createChapter(auth.userId, params.projectId, dto);
  }

  @Get()
  @UseGuards(SessionGuard)
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialChapterProjectParamsDto,
    @Query() query: EditorialProjectQueryDto,
  ) {
    return this.chapters.listChapters(auth.userId, params.projectId, query);
  }

  @Get(':chapterId')
  @UseGuards(SessionGuard)
  detail(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialChapterParamsDto,
  ) {
    return this.chapters.chapterDetail(
      auth.userId,
      params.projectId,
      params.chapterId,
    );
  }

  @Post(':chapterId/releases')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  createRelease(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialChapterParamsDto,
    @Body() dto: CreateEditorialReleaseDto,
  ) {
    return this.chapters.createRelease(
      auth.userId,
      params.projectId,
      params.chapterId,
      dto,
    );
  }

  @Get(':chapterId/releases')
  @UseGuards(SessionGuard)
  releases(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialChapterParamsDto,
    @Query() query: EditorialProjectQueryDto,
  ) {
    return this.chapters.listReleases(
      auth.userId,
      params.projectId,
      params.chapterId,
      query,
    );
  }

  @Get(':chapterId/releases/:releaseId')
  @UseGuards(SessionGuard)
  release(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialReleaseParamsDto,
  ) {
    return this.chapters.releaseDetail(
      auth.userId,
      params.projectId,
      params.chapterId,
      params.releaseId,
    );
  }
}
