import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller.js';
import { LibraryService } from './library.service.js';
import { LibraryMapper } from './library.mapper.js';
import { AuthModule } from '../auth/auth.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [AuthModule, CsrfModule, SessionModule],
  controllers: [LibraryController],
  providers: [LibraryService, LibraryMapper],
  exports: [LibraryService],
})
export class LibraryModule {}
