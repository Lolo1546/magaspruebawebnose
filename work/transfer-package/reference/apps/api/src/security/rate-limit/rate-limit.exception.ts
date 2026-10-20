import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthRateLimitException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    this.retryAfterSeconds = retryAfterSeconds;
  }
  public readonly retryAfterSeconds: number;
}
