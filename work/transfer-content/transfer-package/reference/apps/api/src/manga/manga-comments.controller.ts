import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { GLOBAL_PERMISSIONS } from '../authorization/global-permissions.js';
import {
  CreateMangaCommentDto,
  EditMangaCommentDto,
  MangaCommentIdDto,
  MangaCommentOwnershipDto,
  MangaCommentQueryDto,
  MangaCommentSlugDto,
  ModerateMangaCommentDto,
  RemoveMangaCommentDto,
} from './dto/manga-comment.dto.js';
import { MangaCommentsService } from './manga-comments.service.js';
import { MangaCommentRateLimitGuard } from './manga-comment-rate-limit.guard.js';

@Controller()
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class MangaCommentsController {
  constructor(private readonly service: MangaCommentsService) {}

  @Get('manga/:slug/comments')
  @Header('Cache-Control', 'no-store')
  list(
    @Param() params: MangaCommentSlugDto,
    @Query() query: MangaCommentQueryDto,
  ) {
    return this.service.list(params.slug, query);
  }

  @Get('manga-comments/:commentId/replies')
  @Header('Cache-Control', 'no-store')
  replies(
    @Param() params: MangaCommentIdDto,
    @Query() query: MangaCommentQueryDto,
  ) {
    return this.service.replies(params.commentId, query);
  }

  @Get('me/manga-comments/access')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'private, no-store')
  access(@CurrentAuth() auth: AuthenticatedRequestContext) {
    return this.service.access(auth);
  }

  @Post('me/manga/:slug/comment-ownership')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  ownership(
    @Param() params: MangaCommentSlugDto,
    @Body() dto: MangaCommentOwnershipDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ) {
    return this.service.ownership(params.slug, dto.commentIds, auth);
  }

  @Post('manga/:slug/comments')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, MangaCommentRateLimitGuard)
  @Header('Cache-Control', 'private, no-store')
  create(
    @Param() params: MangaCommentSlugDto,
    @Body() dto: CreateMangaCommentDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ) {
    return this.service.create(params.slug, dto, auth);
  }

  @Patch('manga-comments/:commentId')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, MangaCommentRateLimitGuard)
  @Header('Cache-Control', 'private, no-store')
  edit(
    @Param() params: MangaCommentIdDto,
    @Body() dto: EditMangaCommentDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ) {
    return this.service.mutate(params.commentId, 'edit', dto, auth);
  }

  @Post('manga-comments/:commentId/remove')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  @Header('Cache-Control', 'private, no-store')
  remove(
    @Param() params: MangaCommentIdDto,
    @Body() _dto: RemoveMangaCommentDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ) {
    return this.service.mutate(params.commentId, 'remove', {}, auth);
  }

  @Post('manga-comments/:commentId/hide')
  @HttpCode(200)
  @RequirePermissions(GLOBAL_PERMISSIONS.MODERATE_MANGA_COMMENTS)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, PermissionGuard)
  @Header('Cache-Control', 'private, no-store')
  hide(
    @Param() params: MangaCommentIdDto,
    @Body() dto: ModerateMangaCommentDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ) {
    return this.service.mutate(params.commentId, 'hide', dto, auth);
  }

  @Post('manga-comments/:commentId/unhide')
  @HttpCode(200)
  @RequirePermissions(GLOBAL_PERMISSIONS.MODERATE_MANGA_COMMENTS)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, PermissionGuard)
  @Header('Cache-Control', 'private, no-store')
  unhide(
    @Param() params: MangaCommentIdDto,
    @Body() dto: ModerateMangaCommentDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ) {
    return this.service.mutate(params.commentId, 'unhide', dto, auth);
  }
}
