import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.js';

export const currentAuthFactory = (data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

  if (!request.auth) {
    throw new InternalServerErrorException({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor.',
    });
  }

  return request.auth;
};

export const CurrentAuth = createParamDecorator(currentAuthFactory);
