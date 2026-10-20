import {
  GLOBAL_PERMISSIONS,
  type GlobalPermission,
} from '../src/authorization/global-permissions.js';
import {
  GLOBAL_ROLE_KEYS,
  type GlobalRoleKey,
} from '../src/authorization/global-role-keys.js';

export type GlobalRoleCatalogEntry = {
  readonly key: GlobalRoleKey;
  readonly name: string;
  readonly description: string;
};

export type GlobalPermissionCatalogEntry = {
  readonly key: GlobalPermission;
  readonly description: string;
};

export const GLOBAL_ROLE_CATALOG: readonly GlobalRoleCatalogEntry[] = [
  {
    key: GLOBAL_ROLE_KEYS.USER,
    name: 'User',
    description: 'Usuario global sin privilegios administrativos.',
  },
  {
    key: GLOBAL_ROLE_KEYS.MODERATOR,
    name: 'Moderator',
    description: 'Moderador global con permisos asignados por área.',
  },
  {
    key: GLOBAL_ROLE_KEYS.ADMIN,
    name: 'Administrator',
    description: 'Administrador global de MangaZone.',
  },
];

export const GLOBAL_PERMISSION_CATALOG: readonly GlobalPermissionCatalogEntry[] =
  [
    {
      key: GLOBAL_PERMISSIONS.MODERATE_MANGA_COMMENTS,
      description: 'Ocultar y restaurar comentarios públicos de manga.',
    },
    {
      key: GLOBAL_PERMISSIONS.CATALOG_MANAGE,
      description: 'Gestionar el catalogo editorial.',
    },
    {
      key: GLOBAL_PERMISSIONS.MODERATE_COMMUNITIES,
      description: 'Revisar y moderar comunidades globalmente.',
    },
    {
      key: GLOBAL_PERMISSIONS.MODERATE_SCANLATIONS,
      description: 'Revisar y moderar grupos de scanlation globalmente.',
    },
  ];

export type GlobalAuthorizationCatalogStore = {
  upsertRole(entry: GlobalRoleCatalogEntry): Promise<{ id: string }>;
  upsertPermission(
    entry: GlobalPermissionCatalogEntry,
  ): Promise<{ id: string }>;
  upsertRolePermission(roleId: string, permissionId: string): Promise<void>;
};

export async function provisionGlobalAuthorizationCatalog(
  store: GlobalAuthorizationCatalogStore,
): Promise<void> {
  const roleIds = new Map<GlobalRoleKey, string>();
  const permissionIds = new Map<GlobalPermission, string>();

  for (const entry of GLOBAL_ROLE_CATALOG) {
    const role = await store.upsertRole(entry);
    roleIds.set(entry.key, role.id);
  }

  for (const entry of GLOBAL_PERMISSION_CATALOG) {
    const permission = await store.upsertPermission(entry);
    permissionIds.set(entry.key, permission.id);
  }

  const adminRoleId = roleIds.get(GLOBAL_ROLE_KEYS.ADMIN);
  if (!adminRoleId) {
    throw new Error('Global ADMIN role provisioning failed.');
  }

  for (const permission of GLOBAL_PERMISSION_CATALOG) {
    if (permission.key === GLOBAL_PERMISSIONS.CATALOG_MANAGE) continue;
    const permissionId = permissionIds.get(permission.key);
    if (!permissionId) {
      throw new Error('Global permission provisioning failed.');
    }
    await store.upsertRolePermission(adminRoleId, permissionId);
  }
}
