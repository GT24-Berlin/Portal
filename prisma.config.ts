import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Migrate soll DIRECT nehmen (5432)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL
  }
});
