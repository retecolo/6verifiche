import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

function createPrisma() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter, log: ['error'] });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
