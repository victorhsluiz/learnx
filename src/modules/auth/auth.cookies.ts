import { NextResponse } from "next/server";
import { REFRESH_TOKEN_TTL_MS } from "@/core/security/jwt";
import type { AuthTokens } from "./auth.service";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes, matches the JWT's own expiry
const REFRESH_TOKEN_MAX_AGE_SECONDS = REFRESH_TOKEN_TTL_MS / 1000;

/**
 * Sets both auth cookies on a response. httpOnly so client-side JS can't
 * read the tokens (mitigates XSS token theft); SameSite=Lax since this is
 * a same-site app with no cross-site form posts that need the cookie.
 */
export function setAuthCookies(response: NextResponse, tokens: AuthTokens): NextResponse {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });

  return response;
}

/** Clears both auth cookies, used on logout. */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}
