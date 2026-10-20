import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Put,
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
import { HistoryQueryDto } from './dto/history-query.dto.js';
import { HistoryResponseDto } from './dto/history-response.dto.js';
import { ProgressResponseDto } from './dto/progress-response.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { ReadingService } from './reading.service.js';
import { ReleaseProgressQueryDto } from './dto/release-progress-query.dto.js';

@Controller('me')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get('release-progress')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'private, no-store')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async getReleaseProgress(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: ReleaseProgressQueryDto,
  ) {
    return this.readingService.getReleaseProgress(
      auth.userId,
      query.releaseIds,
    );
  }

  @Put('mangas/:mangaId/progress')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard)
  async updateProgress(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('mangaId', new ParseUUIDPipe()) mangaId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<ProgressResponseDto> {
    return this.readingService.putProgress(auth.userId, mangaId, dto);
  }

  @Get('history')
  @UseGuards(SessionGuard)
  async getHistory(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: HistoryQueryDto,
  ): Promise<HistoryResponseDto> {
    return this.readingService.getHistory(auth.userId, query);
  }

  @Get('mangas/:mangaId/progress')
  @UseGuards(SessionGuard)
  async getProgress(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('mangaId', new ParseUUIDPipe()) mangaId: string,
  ): Promise<{ progress: ProgressResponseDto | null }> {
    return this.readingService.getProgress(auth.userId, mangaId);
  }
}
