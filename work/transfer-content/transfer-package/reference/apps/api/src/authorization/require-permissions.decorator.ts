import { SetMetadata } from '@nestjs/common';
import type { GlobalPermission } from './global-permissions.js';

export const REQUIRED_GLOBAL_PERMISSIONS_METADATA =
  'authorization:required-global-permissions';

export const RequirePermissions = (...permissions: GlobalPermission[]) =>
  SetMetadata(REQUIRED_GLOBAL_PERMISSIONS_METADATA, permissions);
