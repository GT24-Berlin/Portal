import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function makePrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL || process.env.DIRECT_URL || '';

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL / DIRECT_URL in env.');
  }

  // PrismaPg v7+ requires a Pool instance, not a connection string
  return new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
    log: ['error', 'warn']
  });
}

// Lazily-initialised singleton.
// The real client is created on first property access, not at import time.
// This allows Next.js to import the module during the build phase
// (when DATABASE_URL may not be set) without crashing.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = makePrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  }
});
