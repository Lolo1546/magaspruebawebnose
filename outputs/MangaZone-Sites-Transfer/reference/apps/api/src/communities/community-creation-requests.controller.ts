import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CommunityCreationRequestsService } from './community-creation-requests.service.js';
import { CreateCommunityCreationRequestDto } from './dto/create-community-creation-request.dto.js';
import { CommunityCreationRequestQueryDto } from './dto/community-creation-request-query.dto.js';
import type {
  CommunityCreationRequestMutationResponseDto,
  SelfCommunityCreationRequestHistoryDto,
} from './dto/community-creation-request-response.dto.js';
import { ResubmitCommunityCreationRequestDto } from './dto/resubmit-community-creation-request.dto.js';

@Controller('me/community-creation-requests')
@UseGuards(SessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunityCreationRequestsController {
  constructor(
    private readonly creationRequests: CommunityCreationRequestsService,
  ) {}

  @Post()
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.CREATED)
  submit(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Body() dto: CreateCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestMutationResponseDto> {
    return this.creationRequests.submit(auth, dto);
  }

  @Post(':id/resubmit')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  resubmit(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResubmitCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestMutationResponseDto> {
    return this.creationRequests.resubmit(auth, id, dto);
  }

  @Get()
  getHistory(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: CommunityCreationRequestQueryDto,
  ): Promise<SelfCommunityCreationRequestHistoryDto> {
    return this.creationRequests.getHistory(auth.userId, query);
  }
}
