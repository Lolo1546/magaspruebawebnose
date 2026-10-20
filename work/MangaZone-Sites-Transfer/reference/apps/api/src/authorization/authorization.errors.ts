import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export function authenticationRequired(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Autenticación requerida.',
  });
}

export function accountNotEligible(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'ACCOUNT_NOT_ELIGIBLE',
    message: 'La cuenta no es elegible para esta operación.',
  });
}

export function insufficientPermission(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'INSUFFICIENT_PERMISSION',
    message: 'No tienes permiso para realizar esta operación.',
  });
}
