import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service.js';
import {
  CommunityPostCommentsQueryDto,
  CommunityPostIdParamDto,
  CommunityPostsQueryDto,
} from './dto/community-posts-query.dto.js';
import type {
  CommunityFeedResponseDto,
  CommunityPostCommentsResponseDto,
} from './dto/community-response.dto.js';

@Controller('community-posts')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunityPostsController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  getPublicCommunityFeed(
    @Query() query: CommunityPostsQueryDto,
  ): Promise<CommunityFeedResponseDto> {
    return this.communitiesService.getPublicCommunityFeed(query);
  }

  @Get(':postId/comments')
  getPublicPostComments(
    @Param() params: CommunityPostIdParamDto,
    @Query() query: CommunityPostCommentsQueryDto,
  ): Promise<CommunityPostCommentsResponseDto> {
    return this.communitiesService.getPublicPostComments(params.postId, query);
  }
}
