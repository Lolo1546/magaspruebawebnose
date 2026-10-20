import { Module } from '@nestjs/common';
import { MangaController } from './manga.controller';
import { MangaService } from './manga.service';
import { MangaMapper } from './manga.mapper';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SessionModule } from '../session/session.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { RateLimitModule } from '../security/rate-limit/rate-limit.module.js';
import { MangaCommentsController } from './manga-comments.controller.js';
import { MangaCommentsService } from './manga-comments.service.js';
import { MangaCommentsMapper } from './manga-comments.mapper.js';
import { MangaCommentRateLimitGuard } from './manga-comment-rate-limit.guard.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuthorizationModule,
    SessionModule,
    CsrfModule,
    RateLimitModule,
  ],
  controllers: [MangaController, MangaCommentsController],
  providers: [
    MangaService,
    MangaMapper,
    MangaCommentsService,
    MangaCommentsMapper,
    MangaCommentRateLimitGuard,
  ],
})
export class MangaModule {}
