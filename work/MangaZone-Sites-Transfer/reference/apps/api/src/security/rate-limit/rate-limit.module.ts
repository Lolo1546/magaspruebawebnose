import { Module } from '@nestjs/common';
import { RATE_LIMIT_STORAGE } from './rate-limit-storage.port';
import { InMemoryRateLimitStorage } from './in-memory-rate-limit.storage';
import { RateLimitKeyService } from './rate-limit-key.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { ClientIpModule } from '../client-ip/client-ip.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, ClientIpModule],
  providers: [
    {
      provide: RATE_LIMIT_STORAGE,
      useClass: InMemoryRateLimitStorage,
    },
    RateLimitKeyService,
    AuthRateLimitGuard,
  ],
  exports: [AuthRateLimitGuard, RATE_LIMIT_STORAGE, RateLimitKeyService],
})
export class RateLimitModule {}
