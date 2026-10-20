import { Injectable, Inject } from '@nestjs/common';
import { ResendVerificationService } from './resend-verification.service.js';
import { EMAIL_VERIFICATION_SENDER } from '../../email/ports/email-verification-sender.port.js';
import type { EmailVerificationSender } from '../../email/ports/email-verification-sender.port.js';

@Injectable()
export class ResendVerificationApplicationService {
  constructor(
    private readonly resendVerificationService: ResendVerificationService,
    @Inject(EMAIL_VERIFICATION_SENDER)
    private readonly emailSender: EmailVerificationSender,
  ) {}

  async resend(input: {
    userId: string;
    ipAddress: string | null;
    userAgentSummary: string | null;
  }): Promise<void> {
    const delivery =
      await this.resendVerificationService.issueReplacementToken(input);

    if (!delivery) {
      return;
    }

    await this.emailSender.sendVerificationEmail(delivery);
  }
}
