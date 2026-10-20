import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CommunityContentMutationService } from './community-content-mutation.service.js';
import {
  CommunityCommentParamsDto,
  CommunityContentDeletionRequestDto,
  CommunityContentModerationDto,
  CommunityPostParamsDto,
  CreateCommunityPostCommentDto,
  CreateCommunityPostDto,
  EditCommunityPostCommentDto,
  EditCommunityPostDto,
} from './dto/community-content-mutation.dto.js';
import type {
  CommunityCommentMutationResponseDto,
  CommunityContentDeletionRequestResponseDto,
  CommunityPostMutationResponseDto,
} from './dto/community-content-mutation-response.dto.js';
import { CommunitySlugParamDto } from './dto/community-param.dto.js';

@Controller()
@UseGuards(SessionGuard, OriginGuard, CsrfGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunityContentMutationsController {
  constructor(private readonly service: CommunityContentMutationService) {}

  @Post('communities/:slug/posts')
  createPost(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunitySlugParamDto,
    @Body() dto: CreateCommunityPostDto,
  ): Promise<CommunityPostMutationResponseDto> {
    return this.service.createPost(params.slug, dto, auth);
  }

  @Patch('community-posts/:postId')
  editPost(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityPostParamsDto,
    @Body() dto: EditCommunityPostDto,
  ): Promise<CommunityPostMutationResponseDto> {
    return this.service.editPost(params.postId, dto, auth);
  }

  @Post('community-posts/:postId/deletion-request')
  @HttpCode(HttpStatus.CREATED)
  requestPostDeletion(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityPostParamsDto,
    @Body() dto: CommunityContentDeletionRequestDto,
  ): Promise<CommunityContentDeletionRequestResponseDto> {
    return this.service.requestPostDeletion(params.postId, dto, auth);
  }

  @Post('community-posts/:postId/comments')
  createComment(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityPostParamsDto,
    @Body() dto: CreateCommunityPostCommentDto,
  ): Promise<CommunityCommentMutationResponseDto> {
    return this.service.createComment(params.postId, dto, auth);
  }

  @Patch('community-post-comments/:commentId')
  editComment(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityCommentParamsDto,
    @Body() dto: EditCommunityPostCommentDto,
  ): Promise<CommunityCommentMutationResponseDto> {
    return this.service.editComment(params.commentId, dto, auth);
  }

  @Post('community-post-comments/:commentId/deletion-request')
  @HttpCode(HttpStatus.CREATED)
  requestCommentDeletion(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityCommentParamsDto,
    @Body() dto: CommunityContentDeletionRequestDto,
  ): Promise<CommunityContentDeletionRequestResponseDto> {
    return this.service.requestCommentDeletion(params.commentId, dto, auth);
  }

  @Post('community-posts/:postId/hide')
  @HttpCode(HttpStatus.OK)
  hidePost(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityPostParamsDto,
    @Body() dto: CommunityContentModerationDto,
  ): Promise<CommunityPostMutationResponseDto> {
    return this.service.moderatePost(params.postId, 'hide', dto.reason, auth);
  }

  @Post('community-posts/:postId/unhide')
  @HttpCode(HttpStatus.OK)
  unhidePost(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityPostParamsDto,
    @Body() dto: CommunityContentModerationDto,
  ): Promise<CommunityPostMutationResponseDto> {
    return this.service.moderatePost(params.postId, 'unhide', dto.reason, auth);
  }

  @Post('community-post-comments/:commentId/hide')
  @HttpCode(HttpStatus.OK)
  hideComment(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityCommentParamsDto,
    @Body() dto: CommunityContentModerationDto,
  ): Promise<CommunityCommentMutationResponseDto> {
    return this.service.moderateComment(
      params.commentId,
      'hide',
      dto.reason,
      auth,
    );
  }

  @Post('community-post-comments/:commentId/unhide')
  @HttpCode(HttpStatus.OK)
  unhideComment(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityCommentParamsDto,
    @Body() dto: CommunityContentModerationDto,
  ): Promise<CommunityCommentMutationResponseDto> {
    return this.service.moderateComment(
      params.commentId,
      'unhide',
      dto.reason,
      auth,
    );
  }
}
