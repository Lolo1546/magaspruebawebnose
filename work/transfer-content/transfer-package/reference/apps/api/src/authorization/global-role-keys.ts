export const GLOBAL_ROLE_KEYS = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const;

export type GlobalRoleKey =
  (typeof GLOBAL_ROLE_KEYS)[keyof typeof GLOBAL_ROLE_KEYS];
