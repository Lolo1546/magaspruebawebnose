import { UserStatus } from '../../generated/prisma/client.js';

export type BootstrapGlobalAdminResult = {
  readonly assignment: 'created' | 'existing';
};

export type BootstrapGlobalAdminStore = {
  findUser(userId: string): Promise<{ status: UserStatus } | null>;
  findAdminRole(): Promise<{ id: string } | null>;
  findAssignment(userId: string, roleId: string): Promise<boolean>;
  createAssignment(
    userId: string,
    roleId: string,
    assignedByUserId: null,
  ): Promise<void>;
};

type BootstrapGlobalAdminErrorCode =
  | 'BOOTSTRAP_CONFIRMATION_REQUIRED'
  | 'BOOTSTRAP_INVALID_ARGUMENTS'
  | 'BOOTSTRAP_USER_NOT_FOUND'
  | 'BOOTSTRAP_ACCOUNT_NOT_ACTIVE'
  | 'BOOTSTRAP_ADMIN_ROLE_MISSING'
  | 'BOOTSTRAP_ASSIGNMENT_FAILED';

export class BootstrapGlobalAdminError extends Error {
  constructor(readonly code: BootstrapGlobalAdminErrorCode) {
    super(code);
    this.name = 'BootstrapGlobalAdminError';
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export function parseBootstrapGlobalAdminArguments(argv: readonly string[]): {
  userId: string;
} {
  let userId: string | undefined;
  let confirmed = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      continue;
    }
    if (argument === '--confirm' && !confirmed) {
      confirmed = true;
      continue;
    }
    if (argument === '--user-id' && userId === undefined) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new BootstrapGlobalAdminError('BOOTSTRAP_INVALID_ARGUMENTS');
      }
      userId = value;
      index += 1;
      continue;
    }
    throw new BootstrapGlobalAdminError('BOOTSTRAP_INVALID_ARGUMENTS');
  }

  if (!confirmed) {
    throw new BootstrapGlobalAdminError('BOOTSTRAP_CONFIRMATION_REQUIRED');
  }
  if (!userId || !isUuid(userId)) {
    throw new BootstrapGlobalAdminError('BOOTSTRAP_INVALID_ARGUMENTS');
  }

  return { userId };
}

export async function bootstrapGlobalAdmin(
  userId: string,
  store: BootstrapGlobalAdminStore,
): Promise<BootstrapGlobalAdminResult> {
  const user = await store.findUser(userId);
  if (!user) {
    throw new BootstrapGlobalAdminError('BOOTSTRAP_USER_NOT_FOUND');
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw new BootstrapGlobalAdminError('BOOTSTRAP_ACCOUNT_NOT_ACTIVE');
  }

  const adminRole = await store.findAdminRole();
  if (!adminRole) {
    throw new BootstrapGlobalAdminError('BOOTSTRAP_ADMIN_ROLE_MISSING');
  }

  if (await store.findAssignment(userId, adminRole.id)) {
    return { assignment: 'existing' };
  }

  try {
    await store.createAssignment(userId, adminRole.id, null);
    return { assignment: 'created' };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { assignment: 'existing' };
    }
    throw new BootstrapGlobalAdminError('BOOTSTRAP_ASSIGNMENT_FAILED');
  }
}

export async function runBootstrapGlobalAdminCommand(
  argv: readonly string[],
  store: BootstrapGlobalAdminStore,
): Promise<BootstrapGlobalAdminResult> {
  const { userId } = parseBootstrapGlobalAdminArguments(argv);
  return bootstrapGlobalAdmin(userId, store);
}

export async function runWithBootstrapGlobalAdminCleanup<Result>(
  operation: () => Promise<Result>,
  disconnectPrisma: () => Promise<void>,
  endPool: () => Promise<void>,
): Promise<Result> {
  let outcome:
    | { readonly succeeded: true; readonly value: Result }
    | { readonly succeeded: false; readonly error: unknown };
  try {
    outcome = { succeeded: true, value: await operation() };
  } catch (error) {
    outcome = { succeeded: false, error };
  }

  const cleanupErrors: unknown[] = [];
  try {
    await disconnectPrisma();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await endPool();
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (cleanupErrors.length > 0) {
    const errors = outcome.succeeded
      ? cleanupErrors
      : [outcome.error, ...cleanupErrors];
    throw new AggregateError(errors, 'BOOTSTRAP_RESOURCE_CLEANUP_FAILED');
  }
  if (!outcome.succeeded) {
    throw outcome.error;
  }
  return outcome.value;
}
