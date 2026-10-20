import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { GlobalAdminGuard } from '../admin/global-admin.guard.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { EditorialProjectsService } from './editorial-projects.service.js';
import {
  CreateEditorialProjectDto,
  AddEditorialProjectGroupDto,
  EditorialProjectParamsDto,
  EditorialProjectGroupParamsDto,
  RemoveEditorialProjectGroupDto,
} from './dto/editorial-project.dto.js';
import { EditorialProjectQueryDto } from './dto/editorial-project-query.dto.js';

@Controller('editorial/projects')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialProjectsController {
  constructor(private readonly projects: EditorialProjectsService) {}

  @Get()
  @UseGuards(SessionGuard)
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: EditorialProjectQueryDto,
  ) {
    return this.projects.list(auth.userId, query);
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  detail(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialProjectParamsDto,
  ) {
    return this.projects.detail(auth.userId, params.id);
  }

  @Post()
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, GlobalAdminGuard)
  create(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Body() dto: CreateEditorialProjectDto,
  ) {
    return this.projects.create(auth.userId, dto.mangaId, dto.initialGroupId);
  }

  @Post(':id/groups')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, GlobalAdminGuard)
  add(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialProjectParamsDto,
    @Body() dto: AddEditorialProjectGroupDto,
  ) {
    return this.projects.addGroup(auth.userId, params.id, dto.groupId);
  }

  @Post(':id/groups/:groupId/remove')
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(200)
  remove(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialProjectGroupParamsDto,
    @Body() body: RemoveEditorialProjectGroupDto,
  ) {
    void body;
    return this.projects.removeGroup(auth.userId, params.id, params.groupId);
  }
}
