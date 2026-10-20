import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  HttpCode,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { EditorialReleaseParamsDto } from './dto/editorial-chapter.dto.js';
import {
  CreateEditorialPageIntentDto,
  ReorderEditorialPagesDto,
} from './dto/editorial-page.dto.js';
import { EditorialReleasePagesService } from './editorial-release-pages.service.js';

@Controller(
  'editorial/projects/:projectId/chapters/:chapterId/releases/:releaseId/pages',
)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialReleasePagesController {
  constructor(private readonly pages: EditorialReleasePagesService) {}

  @Post('upload-intents')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  create(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialReleaseParamsDto,
    @Body() dto: CreateEditorialPageIntentDto,
  ) {
    return this.pages.createIntent(auth.userId, params, dto);
  }

  @Patch('order')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  reorder(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialReleaseParamsDto,
    @Body() dto: ReorderEditorialPagesDto,
  ) {
    return this.pages.reorder(auth.userId, params, dto);
  }

  @Get()
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'private, no-store')
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialReleaseParamsDto,
  ) {
    return this.pages.list(auth.userId, params);
  }
}

@Controller('media/editorial/releases')
@UseGuards(SessionGuard)
export class EditorialPageMediaController {
  constructor(private readonly pages: EditorialReleasePagesService) {}

  @Get(':releaseId/pages/:pageId')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(302)
  async preview(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('releaseId', new ParseUUIDPipe()) releaseId: string,
    @Param('pageId', new ParseUUIDPipe()) pageId: string,
    @Res({ passthrough: true }) response: Pick<Response, 'setHeader'>,
  ) {
    response.setHeader(
      'Location',
      await this.pages.preview(auth.userId, releaseId, pageId),
    );
  }
}
