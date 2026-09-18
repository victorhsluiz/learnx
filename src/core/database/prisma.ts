import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/core/config/env";

/**
 * Single PrismaClient instance shared across the app.
 *
 * Next.js hot-reloads modules in development, which would otherwise create
 * a new PrismaClient (and a new connection pool) on every edit. Caching the
 * instance on `globalThis` avoids that. In production a fresh module graph
 * is loaded once per process, so this has no effect there.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
