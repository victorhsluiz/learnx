import { ok, withRoute } from "@/core/http";
import { prisma } from "@/core/database/prisma";

/** Liveness endpoint: proves the API surface and the database connection are reachable. */
export const GET = withRoute(async () => {
  const database = await checkDatabase();

  return ok({
    status: database.ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database,
  });
});

async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
