import { ZodError } from "zod";
import { AppError } from "@/core/errors";
import { fail } from "./responses";

/**
 * Wraps a route handler with a standard error-to-HTTP mapping, so
 * controllers don't each need their own try/catch:
 *
 *   - AppError (and subclasses) -> its own status/code/message
 *   - ZodError                  -> 422 VALIDATION_ERROR, with issues in `details`
 *   - anything else             -> 500 INTERNAL_ERROR, logged, message hidden
 *     from the client to avoid leaking internals
 *
 * Usage in a route.ts file (Next.js always passes a context object, even
 * for routes with no dynamic params — hence the unused second parameter):
 *
 *   export const GET = withRoute(async (request) => {
 *     const data = await someService.list();
 *     return ok(data);
 *   });
 *
 * With dynamic route params (Next.js 16 makes `params` a Promise, typed via
 * the generated `RouteContext` helper):
 *
 *   export const GET = withRoute<RouteContext<'/api/v1/words/[id]'>>(
 *     async (request, ctx) => {
 *       const { id } = await ctx.params;
 *       ...
 *     },
 *   );
 */
export function withRoute<Ctx = { params: Promise<Record<string, never>> }>(
  handler: (request: Request, ctx: Ctx) => Promise<Response> | Response,
) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

function handleRouteError(error: unknown): Response {
  if (error instanceof AppError) {
    return fail(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return fail(422, "VALIDATION_ERROR", "Validation failed", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // Unexpected error: log the real cause server-side, but never leak
  // internals (stack traces, driver error messages, etc.) to the client.
  console.error("Unhandled error in route handler:", error);
  return fail(500, "INTERNAL_ERROR", "Internal server error");
}
