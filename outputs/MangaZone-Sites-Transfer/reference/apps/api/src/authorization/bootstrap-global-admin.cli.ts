import 'dotenv/config';

import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { GLOBAL_ROLE_KEYS } from './global-role-keys.js';
import {
  BootstrapGlobalAdminError,
  parseBootstrapGlobalAdminArguments,
  bootstrapGlobalAdmin,
  runWithBootstrapGlobalAdminCleanup,
} from './bootstrap-global-admin.js';

async function main(): Promise<void> {
  const { userId } = parseBootstrapGlobalAdminArguments(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new BootstrapGlobalAdminError('BOOTSTRAP_INVALID_ARGUMENTS');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const result = await runWithBootstrapGlobalAdminCleanup(
    () =>
      bootstrapGlobalAdmin(userId, {
        findUser: (targetUserId) =>
          prisma.user.findUnique({
            where: { id: targetUserId },
            select: { status: true },
          }),
        findAdminRole: () =>
          prisma.role.findUnique({
            where: { key: GLOBAL_ROLE_KEYS.ADMIN },
            select: { id: true },
          }),
        findAssignment: async (targetUserId, roleId) =>
          (await prisma.userRole.findUnique({
            where: { userId_roleId: { userId: targetUserId, roleId } },
            select: { userId: true },
          })) !== null,
        createAssignment: async (targetUserId, roleId, assignedByUserId) => {
          await prisma.userRole.create({
            data: { userId: targetUserId, roleId, assignedByUserId },
          });
        },
      }),
    () => prisma.$disconnect(),
    () => pool.end(),
  );
  process.stdout.write(
    `GLOBAL_ADMIN_ASSIGNMENT_${result.assignment.toUpperCase()}\n`,
  );
}

main().catch((error: unknown) => {
  const code =
    error instanceof BootstrapGlobalAdminError
      ? error.code
      : 'BOOTSTRAP_ADMIN_FAILED';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
});
