/**
 * Reads a single cookie's value from a Request's `Cookie` header.
 *
 * Route handlers that only need to *read* an incoming cookie use this
 * instead of next/headers' `cookies()`: `cookies()` requires the Next.js
 * request-scoped AsyncLocalStorage context, which only exists when a
 * route is actually invoked through the Next.js runtime — not when a
 * route handler function is imported and called directly, as our
 * integration tests do. Parsing the header directly from the `Request`
 * that's already passed to every handler works in both contexts and
 * keeps request handling explicit rather than relying on ambient state.
 *
 * Setting/clearing cookies on the *response* still goes through
 * `NextResponse.cookies` (see modules/auth/auth.cookies.ts), since that
 * has no request-scope dependency.
 */
export function getRequestCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = part.slice(0, separatorIndex).trim();
    if (cookieName === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }

  return undefined;
}
