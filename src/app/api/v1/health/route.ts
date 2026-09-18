import { NextResponse } from "next/server";

/**
 * Liveness endpoint. Intentionally minimal for now — no shared response
 * envelope or error-handling wrapper yet, those land in the architecture
 * backbone task. This route only proves the API surface is reachable.
 */
export async function GET() {
  return NextResponse.json({
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
}
