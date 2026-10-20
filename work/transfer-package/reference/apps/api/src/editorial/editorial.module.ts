import { Module } from '@nestjs/common';
import { EditorialThumbnailsService } from './editorial-thumbnails.service.js';
import {
  EditorialThumbnailsController,
  EditorialThumbnailMediaController,
  PublicChapterThumbnailController,
} from './editorial-thumbnails.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SessionModule } from '../session/session.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { GlobalAdminGuard } from '../admin/global-admin.guard.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import { EditorialAuditWriter } from './editorial-audit.writer.js';
import { EditorialProjectsController } from './editorial-projects.controller.js';
import { EditorialProjectsService } from './editorial-projects.service.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { EditorialMangasController } from './editorial-mangas.controller.js';
import { EditorialMangasService } from './editorial-mangas.service.js';
import { EditorialMangaMapper } from './editorial-manga.mapper.js';
import { EditorialLookupsController } from './editorial-lookups.controller.js';
import { EditorialLookupsService } from './editorial-lookups.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { EditorialUploadsController } from './editorial-uploads.controller.js';
import { EditorialUploadsService } from './editorial-uploads.service.js';
import { EditorialFinalizeService } from './editorial-finalize.service.js';
import { EditorialCoverMediaController } from './editorial-cover-media.controller.js';
import { EditorialCoverMediaService } from './editorial-cover-media.service.js';
import { EditorialChaptersController } from './editorial-chapters.controller.js';
import { EditorialChaptersService } from './editorial-chapters.service.js';
import { EditorialReleasePagesService } from './editorial-release-pages.service.js';
import { EditorialReleaseLifecycleService } from './editorial-release-lifecycle.service.js';
import { EditorialReleaseLifecycleController } from './editorial-release-lifecycle.controller.js';
import { PublishedPageMediaController } from './published-page-media.controller.js';
import { PublishedPageMediaService } from './published-page-media.service.js';
import {
  EditorialReleasePagesController,
  EditorialPageMediaController,
} from './editorial-release-pages.controller.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SessionModule,
    CsrfModule,
    AuthorizationModule,
    StorageModule,
  ],
  controllers: [
    EditorialThumbnailsController,
    EditorialThumbnailMediaController,
    PublicChapterThumbnailController,
    PublishedPageMediaController,
    EditorialReleaseLifecycleController,
    EditorialReleasePagesController,
    EditorialPageMediaController,
    EditorialChaptersController,
    EditorialProjectsController,
    EditorialMangasController,
    EditorialLookupsController,
    EditorialUploadsController,
    EditorialCoverMediaController,
  ],
  providers: [
    EditorialThumbnailsService,
    PublishedPageMediaService,
    EditorialReleaseLifecycleService,
    EditorialReleasePagesService,
    EditorialChaptersService,
    GlobalAdminGuard,
    PermissionGuard,
    EditorialAuthorizationService,
    EditorialAuditWriter,
    EditorialProjectsService,
    EditorialMangasService,
    EditorialMangaMapper,
    EditorialLookupsService,
    EditorialUploadsService,
    EditorialFinalizeService,
    EditorialCoverMediaService,
  ],
  exports: [EditorialAuthorizationService],
})
export class EditorialModule {}
