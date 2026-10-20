import { UserStatus } from '../generated/prisma/client.js';
import { normalizeAuthUsername } from '../src/auth/identity/auth-identity-normalizer.js';

const LOCAL_SEED_ERROR =
  'Catalog seed is restricted to the local development database.';

export type DevelopmentIdentitySeed = {
  readonly createdAt: Date;
  readonly displayName: string;
  readonly email: null;
  readonly emailNormalized: null;
  readonly emailVerifiedAt: null;
  readonly passwordHash: null;
  readonly status: typeof UserStatus.ACTIVE;
  readonly username: string;
  readonly usernameNormalized: string;
};

function developmentIdentity(
  username: string,
  displayName: string,
  createdAt: string,
): DevelopmentIdentitySeed {
  return {
    createdAt: new Date(createdAt),
    displayName,
    email: null,
    emailNormalized: null,
    emailVerifiedAt: null,
    passwordHash: null,
    status: UserStatus.ACTIVE,
    username,
    usernameNormalized: normalizeAuthUsername(username),
  };
}

export const lunaDevelopmentIdentity = developmentIdentity(
  'luna_reader',
  'Luna Reader',
  '2026-01-01T00:00:00.000Z',
);

export const norteDevelopmentIdentity = developmentIdentity(
  'norte_reader',
  'Norte Reader',
  '2026-01-02T00:00:00.000Z',
);

export const developmentIdentities = [
  lunaDevelopmentIdentity,
  norteDevelopmentIdentity,
] as const;

export type ExistingDevelopmentIdentity = {
  readonly email: string | null;
  readonly emailNormalized: string | null;
  readonly emailVerifiedAt: Date | null;
  readonly passwordHash: string | null;
  readonly roleCount: number;
};

export function assertSafeDevelopmentIdentityCollision(
  username: string,
  existing: ExistingDevelopmentIdentity | null,
): void {
  if (
    existing &&
    (existing.email !== null ||
      existing.emailNormalized !== null ||
      existing.emailVerifiedAt !== null ||
      existing.passwordHash !== null ||
      existing.roleCount > 0)
  ) {
    throw new Error(`Reserved development identity collision for ${username}.`);
  }
}

export function assertSafeCatalogSeedTarget(
  databaseUrl: string | undefined,
  nodeEnv: string | undefined,
): string {
  if (nodeEnv === 'production' || !databaseUrl) {
    throw new Error(LOCAL_SEED_ERROR);
  }

  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error(LOCAL_SEED_ERROR);
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(target.pathname.slice(1));
  } catch {
    throw new Error(LOCAL_SEED_ERROR);
  }

  const validProtocol =
    target.protocol === 'postgresql:' || target.protocol === 'postgres:';
  const validPort = target.port === '' || target.port === '5432';

  if (
    !validProtocol ||
    target.hostname !== 'localhost' ||
    !validPort ||
    databaseName !== 'mangazone_dev'
  ) {
    throw new Error(LOCAL_SEED_ERROR);
  }

  return databaseUrl;
}
