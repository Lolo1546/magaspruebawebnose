export type EmailDeliveryErrorCategory = 'RETRYABLE' | 'NON_RETRYABLE';

export class EmailDeliveryError extends Error {
  constructor(
    public readonly category: EmailDeliveryErrorCategory,
    public readonly providerCode?: string,
    cause?: unknown,
  ) {
    super('Email delivery failed', { cause });
    this.name = 'EmailDeliveryError';
  }

  get isRetryable(): boolean {
    return this.category === 'RETRYABLE';
  }
}
