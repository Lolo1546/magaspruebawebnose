import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { authenticationRequired } from '../authorization/authorization.errors.js';
import { GlobalAuthorizationService } from '../authorization/global-authorization.service.js';

@Injectable()
export class GlobalAdminGuard implements CanActivate {
  constructor(private readonly authorization: GlobalAuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) throw authenticationRequired();

    await this.authorization.assertAdmin(request.auth.userId);
    return true;
  }
}
