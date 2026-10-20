import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SessionModule } from '../session/session.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { ReadingController } from './reading.controller.js';
import { ReadingService } from './reading.service.js';

@Module({
  imports: [PrismaModule, SessionModule, CsrfModule],
  controllers: [ReadingController],
  providers: [ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
