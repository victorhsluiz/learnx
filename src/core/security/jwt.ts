import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { randomBytes, createHash } from "node:crypto";
import { env } from "@/core/config/env";

const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AccessTokenPayload {
  sub: string;
}

let cachedAccessSecret: Uint8Array | undefined;

function getAccessSecret(): Uint8Array {
  if (!cachedAccessSecret) {
    cachedAccessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }
  return cachedAccessSecret;
}

/** Signs a short-lived (15 min) JWT access token identifying `userId`. */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getAccessSecret());
}

/**
 * Verifies an access token and returns its payload, or `null` if it's
 * missing, malformed, expired, or has an invalid signature. Callers treat
 * a `null` result as "not authenticated" (see requireUser()), never
 * distinguishing *why* verification failed to avoid leaking details useful
 * to an attacker.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") {
      return null;
    }
    return { sub: payload.sub };
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWSSignatureVerificationFailed ||
      error instanceof joseErrors.JWSInvalid ||
      error instanceof joseErrors.JWTInvalid
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Generates a new opaque refresh token (raw value) plus its SHA-256 hash.
 * Only the hash is ever persisted (see modules/auth); the raw value is
 * returned to the client once and can't be recovered from the hash.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, tokenHash: hashRefreshToken(token) };
}

/** Hashes a raw refresh token for comparison against the stored hash. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
