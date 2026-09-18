import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/core/security/jwt";
import { ACCESS_TOKEN_COOKIE } from "@/modules/auth/auth.cookies";

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (the
 * exported function is still what runs before a matched route renders).
 *
 * This only gates page navigation for routes under the (app) route group
 * (added once that route group exists — see the matcher below) by
 * redirecting to /login when there's no valid access token cookie. It is
 * a UX guard, not the security boundary: every API route still calls
 * requireUser() itself (see core/http/require-user.ts), since Proxy
 * matchers can silently stop covering a route after a refactor.
 *
 * Verification here is JWT-only (no database lookup) to stay fast; an
 * access token that's expired but was never revoked will fail
 * verification the same way a stolen-then-revoked one would from the
 * user's perspective — they're redirected to log in again either way.
 */
export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = accessToken ? await verifyAccessToken(accessToken) : null;

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Matches everything under the future (app) route group's pages once
  // they exist (dashboard, vocabulary, lessons, notes, schedule, ...).
  // Update this list as pages are added; it intentionally does not use a
  // catch-all so adding a new public page doesn't require an opt-out.
  matcher: [
    "/dashboard/:path*",
    "/vocabulary/:path*",
    "/lessons/:path*",
    "/notes/:path*",
    "/schedule/:path*",
  ],
};
