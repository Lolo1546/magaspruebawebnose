import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './crypto/crypto.module';
import { validateEnvironment } from './config/env.validation';
import { authConfig } from './config/auth.config';
import { SessionModule } from './session/session.module';
import { sessionConfig } from './config/session.config';
import { AuthModule } from './auth/auth.module';
import httpConfig from './config/http.config';
import cookieConfig from './config/cookie.config';
import csrfConfig from './config/csrf.config';
import { CsrfModule } from './security/csrf/csrf.module';
import { RateLimitModule } from './security/rate-limit/rate-limit.module';
import { MangaModule } from './manga/manga.module';
import { LibraryModule } from './library/library.module';
import { ReadingModule } from './reading/reading.module';
import { ListsModule } from './lists/lists.module.js';
import { ScanlationGroupsModule } from './scanlation-groups/scanlation-groups.module.js';
import { CommunitiesModule } from './communities/communities.module.js';
import { AdminModule } from './admin/admin.module.js';
import { EditorialModule } from './editorial/editorial.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      load: [authConfig, sessionConfig, httpConfig, cookieConfig, csrfConfig],
    }),
    PrismaModule,
    CryptoModule,
    SessionModule,
    AuthModule,
    CsrfModule,
    RateLimitModule,
    MangaModule,
    LibraryModule,
    ReadingModule,
    ListsModule,
    ScanlationGroupsModule,
    CommunitiesModule,
    AdminModule,
    EditorialModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
