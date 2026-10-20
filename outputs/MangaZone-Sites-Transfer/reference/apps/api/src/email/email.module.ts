import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EMAIL_VERIFICATION_SENDER } from './ports/email-verification-sender.port.js';
import { PASSWORD_RESET_SENDER } from './ports/password-reset-sender.port.js';
import { ResendEmailClient } from './clients/resend-email.client.js';
import { ResendEmailVerificationSender } from './adapters/resend-email-verification.sender.js';
import { ResendPasswordResetSender } from './adapters/resend-password-reset.sender.js';
import { RESEND_SDK_CLIENT } from './tokens/resend-sdk-client.token.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RESEND_SDK_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.getOrThrow<string>('RESEND_API_KEY');
        return new Resend(apiKey);
      },
    },
    ResendEmailClient,
    ResendEmailVerificationSender,
    ResendPasswordResetSender,
    {
      provide: EMAIL_VERIFICATION_SENDER,
      useExisting: ResendEmailVerificationSender,
    },
    {
      provide: PASSWORD_RESET_SENDER,
      useExisting: ResendPasswordResetSender,
    },
  ],
  exports: [EMAIL_VERIFICATION_SENDER, PASSWORD_RESET_SENDER],
})
export class EmailModule {}
