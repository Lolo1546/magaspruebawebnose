import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ListsService } from './lists.service.js';
import { CreateListDto } from './dto/create-list.dto.js';
import { UpdateListDto } from './dto/update-list.dto.js';
import { ListQueryDto, ListDetailQueryDto } from './dto/list-query.dto.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';

@Controller('me/lists')
@UseGuards(SessionGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  async getUserLists(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: ListQueryDto,
  ) {
    return this.listsService.getUserLists(auth.userId, query);
  }

  @Post()
  @UseGuards(OriginGuard, CsrfGuard)
  async createList(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.createList(auth.userId, dto);
  }

  @Get(':listId')
  async getListDetail(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Query() query: ListDetailQueryDto,
  ) {
    return this.listsService.getListDetail(auth.userId, listId, query);
  }

  @Patch(':listId')
  @UseGuards(OriginGuard, CsrfGuard)
  async updateList(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.updateList(auth.userId, listId, dto);
  }

  @Delete(':listId')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteList(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('listId', ParseUUIDPipe) listId: string,
  ) {
    await this.listsService.deleteList(auth.userId, listId);
  }

  @Post(':listId/items')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async addListItem(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AddListItemDto,
  ) {
    await this.listsService.addListItem(auth.userId, listId, dto.mangaId);
  }

  @Delete(':listId/items/:mangaId')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeListItem(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('mangaId', ParseUUIDPipe) mangaId: string,
  ) {
    await this.listsService.removeListItem(auth.userId, listId, mangaId);
  }
}
