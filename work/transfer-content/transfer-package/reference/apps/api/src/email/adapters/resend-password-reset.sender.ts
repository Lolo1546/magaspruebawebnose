import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PasswordResetSender,
  PasswordResetDelivery,
} from '../ports/password-reset-sender.port.js';
import { ResendEmailClient } from '../clients/resend-email.client.js';
import { createPasswordResetTemplate } from '../templates/password-reset.template.js';
import { EmailDeliveryError } from '../errors/email-delivery.error.js';

@Injectable()
export class ResendPasswordResetSender implements PasswordResetSender {
  constructor(
    private readonly configService: ConfigService,
    private readonly emailClient: ResendEmailClient,
  ) {}

  async sendPasswordResetEmail(input: PasswordResetDelivery): Promise<void> {
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

    const resetUrl =
      appPublicUrl + '/reset-password#token=' + encodeURIComponent(input.token);

    const { subject, html, text } = createPasswordResetTemplate({
      resetUrl,
      expiresAt: input.expiresAt,
    });

    if (
      !input.passwordResetTokenId ||
      input.passwordResetTokenId.trim() === ''
    ) {
      throw new EmailDeliveryError('NON_RETRYABLE', 'invalid_token_id');
    }

    const idempotencyKey = `password-reset/${input.passwordResetTokenId}`;
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
