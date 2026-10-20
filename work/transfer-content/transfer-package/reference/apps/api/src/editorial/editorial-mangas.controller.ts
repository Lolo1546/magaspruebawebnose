import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GlobalAdminGuard } from '../admin/global-admin.guard.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { GLOBAL_PERMISSIONS } from '../authorization/global-permissions.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import {
  CreateEditorialMangaDto,
  EditorialMangaParamsDto,
  EditorialMangaQueryDto,
  HideEditorialMangaDto,
  PublishEditorialMangaDto,
  UpdateEditorialMangaDto,
} from './dto/editorial-manga.dto.js';
import type {
  EditorialMangaListDto,
  EditorialMangaResponseDto,
} from './dto/editorial-manga-response.dto.js';
import { EditorialMangasService } from './editorial-mangas.service.js';

@Controller('editorial/mangas')
@UseGuards(SessionGuard)
@RequirePermissions(GLOBAL_PERMISSIONS.CATALOG_MANAGE)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialMangasController {
  constructor(private readonly mangas: EditorialMangasService) {}

  @Get()
  @UseGuards(PermissionGuard)
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: EditorialMangaQueryDto,
  ): Promise<EditorialMangaListDto> {
    return this.mangas.list(auth.userId, query);
  }

  @Post()
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  create(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Body() dto: CreateEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.mangas.create(auth.userId, dto);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  detail(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialMangaParamsDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.mangas.detail(auth.userId, params.id);
  }

  @Patch(':id')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  update(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialMangaParamsDto,
    @Body() dto: UpdateEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.mangas.update(auth.userId, params.id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  publish(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialMangaParamsDto,
    @Body() dto: PublishEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.mangas.publish(auth.userId, params.id, dto);
  }

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard, GlobalAdminGuard)
  hide(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: EditorialMangaParamsDto,
    @Body() dto: HideEditorialMangaDto,
  ): Promise<EditorialMangaResponseDto> {
    return this.mangas.hide(auth.userId, params.id, dto);
  }
}
