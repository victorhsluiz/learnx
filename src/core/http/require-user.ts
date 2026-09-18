import { UnauthorizedError } from "@/core/errors";

/** Minimal identity extracted from a validated access token. */
export interface AuthenticatedUser {
  id: string;
}

/**
 * Resolves the authenticated user for the current request.
 *
 * TODO(auth module): this currently only checks for the presence of an
 * access token cookie and does not verify its signature/expiry yet — JWT
 * verification lands with core/security/jwt.ts in the auth module. Until
 * then, this always throws UnauthorizedError, so no route can accidentally
 * treat an unauthenticated request as authenticated.
 *
 * Once wired up, controllers call this instead of reading cookies
 * themselves:
 *
 *   export const GET = withRoute(async (request) => {
 *     const user = await requireUser(request);
 *     ...
 *   });
 */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const hasAccessTokenCookie = request.headers.get("cookie")?.includes("access_token=");

  if (!hasAccessTokenCookie) {
    throw new UnauthorizedError("Missing access token");
  }

  throw new UnauthorizedError("Access token verification is not implemented yet");
}
