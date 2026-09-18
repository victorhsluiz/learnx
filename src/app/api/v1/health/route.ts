import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";

/**
 * Liveness endpoint. Intentionally minimal for now — no shared response
 * envelope or error-handling wrapper yet, those land in the architecture
 * backbone task. This route only proves the API surface (and the database
 * connection) is reachable.
 */
export async function GET() {
  const database = await checkDatabase();

  return NextResponse.json({
    data: {
      status: database.ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      database,
    },
  });
}

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
