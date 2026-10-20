import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  DefaultValuePipe,
  BadRequestException,
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
import { EditorialThumbnailsService } from './editorial-thumbnails.service.js';
import {
  ThumbnailIntentDto,
  SetThumbnailDto,
  RequestThumbnailDto,
  OverrideThumbnailDto,
  ResolveThumbnailDto,
} from './dto/editorial-thumbnail.dto.js';

@Controller('editorial/chapters/:chapterId/thumbnail')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialThumbnailsController {
  constructor(private readonly thumbnails: EditorialThumbnailsService) {}

  @Get()
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'private, no-store')
  status(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
  ) {
    return this.thumbnails.status(auth.userId, chapterId);
  }

  @Post('upload-intents')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  intent(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Body() dto: ThumbnailIntentDto,
  ) {
    return this.thumbnails.createIntent(auth.userId, chapterId, dto);
  }

  @Post('set')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  set(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Body() dto: SetThumbnailDto,
  ) {
    return this.thumbnails.set(auth.userId, chapterId, dto);
  }

  @Post('override')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  override(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Body() dto: OverrideThumbnailDto,
  ) {
    return this.thumbnails.set(auth.userId, chapterId, dto, true);
  }

  @Post('requests')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  request(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Body() dto: RequestThumbnailDto,
  ) {
    return this.thumbnails.request(auth.userId, chapterId, dto);
  }

  @Get('requests')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'private, no-store')
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (page < 1 || page > 1_000_000) throw new BadRequestException();
    return this.thumbnails.list(auth.userId, chapterId, page);
  }

  @Post('requests/:requestId/approve')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  approve(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: ResolveThumbnailDto,
  ) {
    void dto;
    return this.thumbnails.resolve(auth.userId, chapterId, requestId, true);
  }

  @Post('requests/:requestId/reject')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  reject(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: ResolveThumbnailDto,
  ) {
    void dto;
    return this.thumbnails.resolve(auth.userId, chapterId, requestId, false);
  }
}

@Controller('media/editorial/chapters')
@UseGuards(SessionGuard)
export class EditorialThumbnailMediaController {
  constructor(private readonly thumbnails: EditorialThumbnailsService) {}

  @Get(':chapterId/thumbnails/:assetId')
  @HttpCode(302)
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  async preview(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res({ passthrough: true }) response: Pick<Response, 'setHeader'>,
  ) {
    response.setHeader(
      'Location',
      await this.thumbnails.preview(auth.userId, chapterId, assetId),
    );
  }
}

@Controller('media/chapters')
export class PublicChapterThumbnailController {
  constructor(private readonly thumbnails: EditorialThumbnailsService) {}

  @Get(':chapterId/thumbnail')
  @HttpCode(302)
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  async thumbnail(
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Res({ passthrough: true }) response: Pick<Response, 'setHeader'>,
  ) {
    response.setHeader(
      'Location',
      await this.thumbnails.publicPreview(chapterId),
    );
  }
}
