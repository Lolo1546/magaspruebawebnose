import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LibraryService } from './library.service.js';
import { LibraryQueryDto } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';

@Controller('me/library')
@UseGuards(SessionGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  async getLibrary(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: LibraryQueryDto,
  ) {
    return this.libraryService.getLibrary(auth.userId, query);
  }

  @Put(':mangaId')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async putEntry(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('mangaId') mangaId: string,
    @Body() dto: UpdateLibraryEntryDto,
  ) {
    await this.libraryService.putEntry(auth.userId, mangaId, dto);
  }

  @Delete(':mangaId')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntry(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('mangaId') mangaId: string,
  ) {
    await this.libraryService.deleteEntry(auth.userId, mangaId);
  }
}
