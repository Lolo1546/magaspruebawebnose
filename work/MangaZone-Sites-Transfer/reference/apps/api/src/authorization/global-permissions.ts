export const GLOBAL_PERMISSIONS = {
  MODERATE_MANGA_COMMENTS: 'moderate.manga_comments',
  MODERATE_COMMUNITIES: 'moderate.communities',
  MODERATE_SCANLATIONS: 'moderate.scanlations',
  CATALOG_MANAGE: 'catalog.manage',
} as const;

export type GlobalPermission =
  (typeof GLOBAL_PERMISSIONS)[keyof typeof GLOBAL_PERMISSIONS];

export const KNOWN_GLOBAL_PERMISSIONS = Object.freeze(
  Object.values(GLOBAL_PERMISSIONS),
) as readonly GlobalPermission[];

const knownGlobalPermissionSet = new Set<string>(KNOWN_GLOBAL_PERMISSIONS);

export function isKnownGlobalPermission(
  permission: string,
): permission is GlobalPermission {
  return knownGlobalPermissionSet.has(permission);
}
