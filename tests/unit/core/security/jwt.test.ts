import { describe, expect, it } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "@/core/security/jwt";

describe("access tokens", () => {
  it("signs a token that verifies back to the same user id", async () => {
    const token = await signAccessToken("user-123");
    const payload = await verifyAccessToken(token);

    expect(payload).toEqual({ sub: "user-123" });
  });

  it("returns null for a malformed token", async () => {
    const payload = await verifyAccessToken("not-a-jwt");

    expect(payload).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("a".repeat(32));
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(wrongSecret);

    const payload = await verifyAccessToken(token);

    expect(payload).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const { SignJWT } = await import("jose");
    const { env } = await import("@/core/config/env");
    const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(secret);

    const payload = await verifyAccessToken(token);

    expect(payload).toBeNull();
  });
});

describe("refresh tokens", () => {
  it("generates a unique token and a deterministic hash of it", () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashRefreshToken(first.token));
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("produces a hash that does not reveal the raw token", () => {
    const { token, tokenHash } = generateRefreshToken();

    expect(tokenHash).not.toContain(token);
  });
});
