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
import { CreateScanlationGroupCreationRequestDto } from './dto/create-scanlation-group-creation-request.dto.js';
import { ScanlationGroupCreationRequestQueryDto } from './dto/scanlation-group-creation-request-query.dto.js';
import type {
  ScanlationGroupCreationRequestMutationResponseDto,
  SelfScanlationGroupCreationRequestHistoryDto,
} from './dto/scanlation-group-creation-request-response.dto.js';
import { ResubmitScanlationGroupCreationRequestDto } from './dto/resubmit-scanlation-group-creation-request.dto.js';
import { ScanlationGroupCreationRequestsService } from './scanlation-group-creation-requests.service.js';

@Controller('me/scanlation-group-creation-requests')
@UseGuards(SessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ScanlationGroupCreationRequestsController {
  constructor(
    private readonly creationRequests: ScanlationGroupCreationRequestsService,
  ) {}

  @Post()
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.CREATED)
  submit(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Body() dto: CreateScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestMutationResponseDto> {
    return this.creationRequests.submit(auth, dto);
  }

  @Post(':id/resubmit')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  resubmit(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResubmitScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestMutationResponseDto> {
    return this.creationRequests.resubmit(auth, id, dto);
  }

  @Get()
  getHistory(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: ScanlationGroupCreationRequestQueryDto,
  ): Promise<SelfScanlationGroupCreationRequestHistoryDto> {
    return this.creationRequests.getHistory(auth.userId, query);
  }
}
