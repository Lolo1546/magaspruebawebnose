import {
  Body,
  Controller,
  Header,
  Post,
  Param,
  ParseUUIDPipe,
  HttpCode,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { GLOBAL_PERMISSIONS } from '../authorization/global-permissions.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import {
  CreateEditorialUploadIntentDto,
  FinalizeEditorialUploadDto,
} from './dto/editorial-upload.dto.js';
import { EditorialFinalizeService } from './editorial-finalize.service.js';
import { EditorialUploadsService } from './editorial-uploads.service.js';

@Controller('editorial/uploads/intents')
@UseGuards(SessionGuard, OriginGuard, CsrfGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialUploadsController {
  constructor(
    private readonly uploads: EditorialUploadsService,
    private readonly finalizer: EditorialFinalizeService,
  ) {}

  @Post(':intentId/finalize')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  finalize(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('intentId', new ParseUUIDPipe()) intentId: string,
    @Body() dto: FinalizeEditorialUploadDto,
  ) {
    void dto;
    return this.finalizer.finalize(auth.userId, intentId);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions(GLOBAL_PERMISSIONS.CATALOG_MANAGE)
  @Header('Cache-Control', 'private, no-store')
  create(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Body() dto: CreateEditorialUploadIntentDto,
  ) {
    return this.uploads.create(auth.userId, dto);
  }
}
