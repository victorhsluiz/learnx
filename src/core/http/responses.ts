import { NextResponse } from "next/server";
import type { AppErrorCode } from "@/core/errors";

/** Shape of every successful API response. */
export interface SuccessBody<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Shape of every error API response. */
export interface ErrorBody {
  error: {
    code: AppErrorCode | "UNKNOWN_ERROR";
    message: string;
    details?: unknown;
  };
}

/** Wraps `data` in the standard success envelope, defaulting to HTTP 200. */
export function ok<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }) {
  const body: SuccessBody<T> = init?.meta ? { data, meta: init.meta } : { data };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

/** Wraps `data` in the standard success envelope with HTTP 201 (Created). */
export function created<T>(data: T, meta?: Record<string, unknown>) {
  return ok(data, { status: 201, meta });
}

/** HTTP 204 (No Content), used for successful deletes with no response body. */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Wraps an error in the standard error envelope. */
export function fail(
  status: number,
  code: ErrorBody["error"]["code"],
  message: string,
  details?: unknown,
) {
  const body: ErrorBody = {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}
