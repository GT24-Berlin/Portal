import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Runtime should prefer the pooled connection string.
// DIRECT_URL is intended for CLI / migrate-style direct connections.
const connectionString =
  process.env.DATABASE_URL || process.env.DIRECT_URL || '';

if (!connectionString) {
  throw new Error('Missing DATABASE_URL / DIRECT_URL in env.');
}

// PrismaPg v7+ requires a Pool instance, not a connection string
const pool = new Pool({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
