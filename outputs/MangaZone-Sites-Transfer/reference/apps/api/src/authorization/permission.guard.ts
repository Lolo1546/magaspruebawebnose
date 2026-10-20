import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import {
  authenticationRequired,
  insufficientPermission,
} from './authorization.errors.js';
import { GlobalAuthorizationService } from './global-authorization.service.js';
import type { GlobalPermission } from './global-permissions.js';
import { REQUIRED_GLOBAL_PERMISSIONS_METADATA } from './require-permissions.decorator.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: GlobalAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<
      readonly GlobalPermission[]
    >(REQUIRED_GLOBAL_PERMISSIONS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permissions || permissions.length === 0) {
      throw insufficientPermission();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw authenticationRequired();
    }

    await this.authorization.assertPermissions(
      request.auth.userId,
      permissions,
    );
    return true;
  }
}
