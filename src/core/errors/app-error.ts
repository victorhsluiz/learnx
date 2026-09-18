/**
 * Machine-readable error codes used across the API. Kept as a union of
 * string literals (not a Prisma-style enum) so new codes are just a type
 * addition, with no schema/migration implications.
 */
export type AppErrorCode =
  "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

/**
 * Base class for all expected, handled application errors.
 *
 * Anything thrown as an AppError (or subclass) is treated as a known,
 * intentional failure by withRoute(): it's mapped to its `status` and
 * serialized as `{ error: { code, message, details } }`. Anything else
 * that throws is treated as a bug and mapped to a generic 500 instead of
 * leaking internals to the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(message: string, status: number, code: AppErrorCode, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** 422 — the request payload failed validation. */
export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/** 401 — the request has no (or an invalid) authentication credential. */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/** 403 — the caller is authenticated but not allowed to do this. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/** 404 — the requested resource doesn't exist (or isn't visible to the caller). */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/** 409 — the request conflicts with the current state (e.g. duplicate unique field). */
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, 409, "CONFLICT", details);
    this.name = "ConflictError";
  }
}
