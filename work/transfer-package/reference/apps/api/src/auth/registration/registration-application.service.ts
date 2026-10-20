import { Injectable, Inject } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import type { RegisterInput, AuthResult } from '../types/auth.types.js';
import { EMAIL_VERIFICATION_SENDER } from '../../email/ports/email-verification-sender.port.js';
import type { EmailVerificationSender } from '../../email/ports/email-verification-sender.port.js';

@Injectable()
export class RegistrationApplicationService {
  constructor(
    private readonly authService: AuthService,
    @Inject(EMAIL_VERIFICATION_SENDER)
    private readonly emailSender: EmailVerificationSender,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const result = await this.authService.register(input);
    await this.emailSender.sendVerificationEmail(result.verificationDelivery);
    return result.auth;
  }
}
