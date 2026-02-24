import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString =
  process.env.DATABASE_URL || process.env.DIRECT_URL || '';

if (!connectionString) {
  throw new Error('Missing DATABASE_URL / DIRECT_URL in env.');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
    log: ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
