import {
  Body,
  Controller,
  Header,
  HttpCode,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { EditorialReleaseParamsDto } from './dto/editorial-chapter.dto.js';
import { EditorialReleaseTransitionDto } from './dto/editorial-release-transition.dto.js';
import { EditorialReleaseLifecycleService } from './editorial-release-lifecycle.service.js';

@Controller(
  'editorial/projects/:projectId/chapters/:chapterId/releases/:releaseId',
)
@UseGuards(SessionGuard, OriginGuard, CsrfGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialReleaseLifecycleController {
  constructor(private readonly lifecycle: EditorialReleaseLifecycleService) {}

  @Post('publish')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  publish(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialReleaseParamsDto,
    @Body() dto: EditorialReleaseTransitionDto,
  ) {
    return this.lifecycle.transition(auth.userId, params, dto, 'publish');
  }

  @Post('withdraw')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  withdraw(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialReleaseParamsDto,
    @Body() dto: EditorialReleaseTransitionDto,
  ) {
    return this.lifecycle.transition(auth.userId, params, dto, 'withdraw');
  }
}
