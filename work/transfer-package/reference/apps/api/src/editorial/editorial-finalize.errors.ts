import { HttpException } from '@nestjs/common';

export function finalizeError(code: string, status = 409): HttpException {
  return new HttpException(
    {
      statusCode: status,
      code,
      message: 'Cover upload could not be finalized.',
    },
    status,
  );
}
