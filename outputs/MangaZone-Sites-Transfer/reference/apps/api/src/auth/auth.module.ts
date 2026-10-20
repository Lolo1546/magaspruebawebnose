import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module.js';
import { SessionModule } from '../session/session.module.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './guards/session.guard.js';
import { OptionalSessionGuard } from './guards/optional-session.guard.js';
import { AuthController } from './auth.controller.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { EmailVerificationService } from './email-verification/email-verification.service.js';
import { ResendVerificationService } from './email-verification/resend-verification.service.js';
import { ResendVerificationApplicationService } from './email-verification/resend-verification-application.service.js';
import { EmailVerificationController } from './email-verification/email-verification.controller.js';
import { RegistrationApplicationService } from './registration/registration-application.service.js';
import { EmailModule } from '../email/email.module.js';
import { ClientIpModule } from '../security/client-ip/client-ip.module.js';
import { RateLimitModule } from '../security/rate-limit/rate-limit.module.js';
import { PasswordResetService } from './password-reset/password-reset.service.js';
import { PasswordResetDeliveryCipherService } from './password-reset/password-reset-delivery-cipher.service.js';
import { PasswordResetRequestWorker } from './password-reset/password-reset-request.worker.js';

@Module({
  imports: [
    CryptoModule,
    SessionModule,
    CsrfModule,
    EmailModule,
    ClientIpModule,
    RateLimitModule,
  ],
  controllers: [AuthController, EmailVerificationController],
  providers: [
    AuthService,
    SessionGuard,
    OptionalSessionGuard,
    EmailVerificationService,
    ResendVerificationService,
    ResendVerificationApplicationService,
    RegistrationApplicationService,
    PasswordResetService,
    PasswordResetDeliveryCipherService,
    PasswordResetRequestWorker,
  ],
  exports: [AuthService, SessionGuard, OptionalSessionGuard],
})
export class AuthModule {}
