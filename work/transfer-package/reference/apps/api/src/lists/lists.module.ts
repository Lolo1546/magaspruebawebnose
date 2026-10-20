import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller.js';
import { ListsService } from './lists.service.js';
import { ListsMapper } from './lists.mapper.js';
import { AuthModule } from '../auth/auth.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [AuthModule, CsrfModule, SessionModule],
  controllers: [ListsController],
  providers: [ListsService, ListsMapper],
  exports: [ListsService],
})
export class ListsModule {}
