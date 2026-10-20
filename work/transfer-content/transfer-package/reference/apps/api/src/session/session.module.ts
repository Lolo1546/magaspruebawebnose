import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { SessionService } from './session.service.js';
import { sessionConfig } from '../config/session.config.js';

@Module({
  imports: [PrismaModule, CryptoModule, ConfigModule.forFeature(sessionConfig)],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
