import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service.js';
import { CommunitySlugParamDto } from './dto/community-param.dto.js';
import { CommunityPostsQueryDto } from './dto/community-posts-query.dto.js';
import { CommunityQueryDto } from './dto/community-query.dto.js';
import type {
  CommunityDetailResponseDto,
  CommunityIndexResponseDto,
  CommunityPostsResponseDto,
} from './dto/community-response.dto.js';

@Controller('communities')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  getPublicCommunities(
    @Query() query: CommunityQueryDto,
  ): Promise<CommunityIndexResponseDto> {
    return this.communitiesService.getPublicCommunities(query);
  }

  @Get(':slug/posts')
  getPublicCommunityPosts(
    @Param() params: CommunitySlugParamDto,
    @Query() query: CommunityPostsQueryDto,
  ): Promise<CommunityPostsResponseDto> {
    return this.communitiesService.getPublicCommunityPosts(params.slug, query);
  }

  @Get(':slug')
  getPublicCommunityBySlug(
    @Param() params: CommunitySlugParamDto,
  ): Promise<CommunityDetailResponseDto> {
    return this.communitiesService.getPublicCommunityBySlug(params.slug);
  }
}
