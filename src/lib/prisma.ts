import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Runtime should prefer the direct DB URL; the pooled URL can be flaky in dev
// and Prisma migrations already use DIRECT_URL as the source of truth.
const connectionString =
  process.env.DIRECT_URL || process.env.DATABASE_URL || '';

if (!connectionString) {
  throw new Error('Missing DATABASE_URL / DIRECT_URL in env.');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(connectionString),
    log: ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
