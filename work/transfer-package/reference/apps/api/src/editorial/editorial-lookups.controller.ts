import {
  Controller,
  Get,
  Query,
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
import { EditorialLookupsService } from './editorial-lookups.service.js';
import { EditorialLookupQueryDto } from './dto/editorial-lookup-query.dto.js';

@Controller('editorial')
@UseGuards(SessionGuard, PermissionGuard)
@RequirePermissions(GLOBAL_PERMISSIONS.CATALOG_MANAGE)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EditorialLookupsController {
  constructor(private readonly lookups: EditorialLookupsService) {}

  @Get('genres')
  genres(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: EditorialLookupQueryDto,
  ) {
    return this.lookups.genres(auth.userId, query);
  }

  @Get('creators')
  creators(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Query() query: EditorialLookupQueryDto,
  ) {
    return this.lookups.creators(auth.userId, query);
  }
}
