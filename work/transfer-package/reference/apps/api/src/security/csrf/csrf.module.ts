import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfService } from './csrf.service.js';
import { OriginValidator } from './origin.validator.js';
import { OriginGuard } from './guards/origin.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { ConditionalCsrfGuard } from './guards/conditional-csrf.guard.js';
import csrfConfig from '../../config/csrf.config.js';
import httpConfig from '../../config/http.config.js';

@Module({
  imports: [
    ConfigModule.forFeature(csrfConfig),
    ConfigModule.forFeature(httpConfig),
  ],
  providers: [
    CsrfService,
    OriginValidator,
    OriginGuard,
    CsrfGuard,
    ConditionalCsrfGuard,
  ],
  exports: [
    CsrfService,
    OriginValidator,
    OriginGuard,
    CsrfGuard,
    ConditionalCsrfGuard,
  ],
})
export class CsrfModule {}
