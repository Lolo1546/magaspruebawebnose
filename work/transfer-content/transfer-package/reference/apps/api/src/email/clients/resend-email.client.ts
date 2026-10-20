import { Inject, Injectable } from '@nestjs/common';
import { RESEND_SDK_CLIENT } from '../tokens/resend-sdk-client.token.js';
import type { ResendSdkContract } from '../tokens/resend-sdk-client.token.js';
import { EmailDeliveryError } from '../errors/email-delivery.error.js';

@Injectable()
export class ResendEmailClient {
  constructor(
    @Inject(RESEND_SDK_CLIENT)
    private readonly resend: ResendSdkContract,
  ) {}

  async send(input: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
  }): Promise<{ providerMessageId: string }> {
    if (!input.idempotencyKey || input.idempotencyKey.trim() === '') {
      throw new EmailDeliveryError(
        'NON_RETRYABLE',
        'invalid_idempotency_key_local',
      );
    }
    if (input.idempotencyKey.length > 256) {
      throw new EmailDeliveryError(
        'NON_RETRYABLE',
        'invalid_idempotency_key_length',
      );
    }

    try {
      const { data, error } = await this.resend.emails.send(
        {
          from: input.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        },
        {
          idempotencyKey: input.idempotencyKey,
        },
      );

      if (error) {
        const providerCode = this.getProviderCode(error);
        const category = this.classifyProviderCode(providerCode);
        throw new EmailDeliveryError(category, providerCode);
      }

      if (!data || !data.id || data.id.trim() === '') {
        throw new EmailDeliveryError('NON_RETRYABLE', 'missing_message_id');
      }

      return { providerMessageId: data.id };
    } catch (err) {
      if (err instanceof EmailDeliveryError) {
        throw err;
      }
      const providerCode = this.getProviderCode(err);
      const category = this.classifyProviderCode(providerCode);
      throw new EmailDeliveryError(category, providerCode);
    }
  }

  private getProviderCode(error: unknown): string {
    let code = 'unknown_exception';

    if (error !== null && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      if (typeof errObj.name === 'string' && errObj.name.trim() !== '') {
        code = errObj.name;
      }
    }

    // Sanitize: allow only a-z, A-Z, 0-9, _, -, .
    // Replace anything else with _
    let sanitized = code.replace(/[^a-zA-Z0-9_\-.]/g, '_');

    // Max 64 chars
    if (sanitized.length > 64) {
      sanitized = sanitized.slice(0, 64);
    }

    if (sanitized.trim() === '' || sanitized === '_') {
      return 'unknown_exception';
    }

    return sanitized;
  }

  private classifyProviderCode(code: string): 'RETRYABLE' | 'NON_RETRYABLE' {
    const retryableCodes = ['rate_limit_exceeded', 'internal_server_error'];
    if (retryableCodes.includes(code)) {
      return 'RETRYABLE';
    }
    return 'NON_RETRYABLE';
  }
}
