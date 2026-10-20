import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailVerificationSender,
  VerificationDelivery,
} from '../ports/email-verification-sender.port.js';
import { ResendEmailClient } from '../clients/resend-email.client.js';
import { createEmailVerificationTemplate } from '../templates/email-verification.template.js';
import { EmailDeliveryError } from '../errors/email-delivery.error.js';

@Injectable()
export class ResendEmailVerificationSender implements EmailVerificationSender {
  constructor(
    private readonly configService: ConfigService,
    private readonly emailClient: ResendEmailClient,
  ) {}

  async sendVerificationEmail(input: VerificationDelivery): Promise<void> {
    const fromName = this.configService.getOrThrow<string>('RESEND_FROM_NAME');
    const fromEmail =
      this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');

    if (
      !fromName ||
      fromName.trim() === '' ||
      !fromEmail ||
      fromEmail.trim() === ''
    ) {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_sender_format');
    }

    if (/[\r\n]/.test(fromName) || /[\r\n]/.test(fromEmail)) {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_sender_format');
    }

    const from = `${fromName} <${fromEmail}>`;
    if (/[\r\n]/.test(from)) {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_sender_format');
    }

    if (!input.email || input.email.trim() === '') {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_recipient_format');
    }

    if (/[\r\n]/.test(input.email)) {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_recipient_format');
    }

    if (!input.token || input.token.trim() === '') {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_token');
    }

    const rawAppPublicUrl =
      this.configService.getOrThrow<string>('APP_PUBLIC_URL');
    const appPublicUrl = rawAppPublicUrl.endsWith('/')
      ? rawAppPublicUrl.slice(0, -1)
      : rawAppPublicUrl;

    const verificationUrl =
      appPublicUrl + '/verify-email#token=' + encodeURIComponent(input.token);

    const { subject, html, text } = createEmailVerificationTemplate({
      verificationUrl,
      expiresAt: input.expiresAt,
    });

    if (!input.verificationTokenId || input.verificationTokenId.trim() === '') {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_token_id');
    }

    const idempotencyKey = `email-verification/${input.verificationTokenId}`;
    if (idempotencyKey.length > 256) {
      throw new EmailDeliveryError(
        'NON_RETRYABLE',
        'invalid_idempotency_key_length',
      );
    }

    await this.emailClient.send({
      to: input.email,
      from,
      subject,
      html,
      text,
      idempotencyKey,
    });
  }
}
