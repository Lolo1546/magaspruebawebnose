import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { provisionGlobalAuthorizationCatalog } from '../../prisma/global-authorization-catalog.js';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || process.argv.slice(2).length !== 0)
    throw new Error('Invalid catalog provisioning configuration');
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await prisma.$transaction(async (tx) => {
      await provisionGlobalAuthorizationCatalog({
        upsertRole: (entry) =>
          tx.role.upsert({
            where: { key: entry.key },
            update: { name: entry.name, description: entry.description },
            create: entry,
            select: { id: true },
          }),
        upsertPermission: (entry) =>
          tx.permission.upsert({
            where: { key: entry.key },
            update: { description: entry.description },
            create: entry,
            select: { id: true },
          }),
        upsertRolePermission: async (roleId, permissionId) => {
          await tx.rolePermission.upsert({
            where: { roleId_permissionId: { roleId, permissionId } },
            update: {},
            create: { roleId, permissionId },
          });
        },
      });
    });
    process.stdout.write('GLOBAL_AUTHORIZATION_CATALOG_PROVISIONED\n');
  } finally {
    try {
      await prisma.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

main().catch(() => {
  process.stderr.write('GLOBAL_AUTHORIZATION_CATALOG_PROVISIONING_FAILED\n');
  process.exitCode = 1;
});
