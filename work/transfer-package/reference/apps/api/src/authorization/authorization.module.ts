import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { GlobalAuthorizationService } from './global-authorization.service.js';
import { PermissionGuard } from './permission.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [GlobalAuthorizationService, PermissionGuard],
  exports: [GlobalAuthorizationService, PermissionGuard],
})
export class AuthorizationModule {}
