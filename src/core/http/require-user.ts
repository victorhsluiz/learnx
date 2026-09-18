import { UnauthorizedError } from "@/core/errors";
import { verifyAccessToken } from "@/core/security/jwt";
import { ACCESS_TOKEN_COOKIE } from "@/modules/auth/auth.cookies";
import { getRequestCookie } from "./cookies";

/** Minimal identity extracted from a validated access token. */
export interface AuthenticatedUser {
  id: string;
}

/**
 * Resolves the authenticated user for the current request from the
 * `access_token` httpOnly cookie. Throws UnauthorizedError if the cookie
 * is missing, or if the token is malformed, expired, or has an invalid
 * signature — controllers call this instead of reading/verifying cookies
 * themselves:
 *
 *   export const GET = withRoute(async (request) => {
 *     const user = await requireUser(request);
 *     ...
 *   });
 */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const accessToken = getRequestCookie(request, ACCESS_TOKEN_COOKIE);

  if (!accessToken) {
    throw new UnauthorizedError("Missing access token");
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    throw new UnauthorizedError("Invalid or expired access token");
  }

  return { id: payload.sub };
}
