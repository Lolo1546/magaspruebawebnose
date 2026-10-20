import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { SessionModule } from '../session/session.module.js';
import { AdminController } from './admin.controller.js';
import { AdminMutationsController } from './admin-mutations.controller.js';
import { AdminMutationsService } from './admin-mutations.service.js';
import { AdministrativeAuditWriter } from './administrative-audit.writer.js';
import { AdminMapper } from './admin.mapper.js';
import { AdminService } from './admin.service.js';
import { GlobalAdminGuard } from './global-admin.guard.js';
import { LastActiveAdminInvariant } from './last-active-admin.invariant.js';

@Module({
  imports: [AuthModule, AuthorizationModule, CsrfModule, SessionModule],
  controllers: [AdminController, AdminMutationsController],
  providers: [
    AdminService,
    AdminMutationsService,
    AdminMapper,
    AdministrativeAuditWriter,
    GlobalAdminGuard,
    LastActiveAdminInvariant,
  ],
})
export class AdminModule {}
