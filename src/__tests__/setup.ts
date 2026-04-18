import { beforeEach } from 'vitest';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/test.db' });
export const testPrisma = new PrismaClient({ adapter });

// Inject testPrisma into the singleton slot so all service imports use the same instance.
// setup.ts (setupFiles) runs before test file modules are evaluated, so this takes effect
// before any service module resolves `globalForPrisma.prisma`.
(globalThis as Record<string, unknown>).prisma = testPrisma;

beforeEach(async () => {
  await testPrisma.testResult.deleteMany();
  await testPrisma.testCase.deleteMany();
  await testPrisma.platform.deleteMany();
});
