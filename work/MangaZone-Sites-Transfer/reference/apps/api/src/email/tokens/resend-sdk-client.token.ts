export const RESEND_SDK_CLIENT = Symbol('RESEND_SDK_CLIENT');

export interface ResendSdkContract {
  emails: {
    send(
      payload: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text: string;
      },
      options?: {
        idempotencyKey?: string;
      },
    ): Promise<{
      data: { id: string } | null;
      error: { name?: string; message?: string } | null;
    }>;
  };
}
