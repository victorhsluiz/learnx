import { afterAll, afterEach, describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { prisma } from "@/core/database/prisma";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/modules/auth/auth.cookies";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Extracts a cookie's value from a Set-Cookie response header. */
function extractCookieValue(setCookieHeader: string, name: string): string {
  const match = new RegExp(`${name}=([^;]+)`).exec(setCookieHeader);
  if (!match) {
    throw new Error(`Cookie ${name} not found in Set-Cookie header`);
  }
  return match[1];
}

function requestWithCookies(url: string, cookies: Record<string, string>, init?: RequestInit) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new Request(url, { ...init, headers: { ...init?.headers, cookie: cookieHeader } });
}

const ctx = { params: Promise.resolve({}) };

async function registerAndGetCookies(email: string) {
  const response = await register(
    jsonRequest("http://localhost/api/v1/auth/register", {
      email,
      password: "correct-password",
      name: "Session Test",
    }),
    ctx,
  );
  const setCookie = response.headers.get("set-cookie") ?? "";
  return {
    accessToken: extractCookieValue(setCookie, ACCESS_TOKEN_COOKIE),
    refreshToken: extractCookieValue(setCookie, REFRESH_TOKEN_COOKIE),
  };
}

describe("session endpoints", () => {
  afterEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns the current user when the access token cookie is valid", async () => {
      const email = "me-test@learnx.dev";
      const { accessToken } = await registerAndGetCookies(email);

      const response = await me(
        requestWithCookies("http://localhost/api/v1/auth/me", {
          [ACCESS_TOKEN_COOKIE]: accessToken,
        }),
        ctx,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.user.email).toBe(email);
    });

    it("returns 401 without an access token cookie", async () => {
      const response = await me(new Request("http://localhost/api/v1/auth/me"), ctx);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("rotates the refresh token and returns a fresh session", async () => {
      const email = "refresh-test@learnx.dev";
      const { refreshToken } = await registerAndGetCookies(email);

      const response = await refresh(
        requestWithCookies(
          "http://localhost/api/v1/auth/refresh",
          { [REFRESH_TOKEN_COOKIE]: refreshToken },
          { method: "POST" },
        ),
        ctx,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.user.email).toBe(email);

      const setCookie = response.headers.get("set-cookie") ?? "";
      const newRefreshToken = extractCookieValue(setCookie, REFRESH_TOKEN_COOKIE);
      expect(newRefreshToken).not.toBe(refreshToken);
    });

    it("rejects reuse of an already-rotated refresh token", async () => {
      const email = "reuse-test@learnx.dev";
      const { refreshToken } = await registerAndGetCookies(email);

      await refresh(
        requestWithCookies(
          "http://localhost/api/v1/auth/refresh",
          { [REFRESH_TOKEN_COOKIE]: refreshToken },
          { method: "POST" },
        ),
        ctx,
      );

      const secondAttempt = await refresh(
        requestWithCookies(
          "http://localhost/api/v1/auth/refresh",
          { [REFRESH_TOKEN_COOKIE]: refreshToken },
          { method: "POST" },
        ),
        ctx,
      );
      const body = await secondAttempt.json();

      expect(secondAttempt.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 without a refresh token cookie", async () => {
      const response = await refresh(
        new Request("http://localhost/api/v1/auth/refresh", { method: "POST" }),
        ctx,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("clears both auth cookies and revokes the refresh token", async () => {
      const email = "logout-test@learnx.dev";
      const { refreshToken } = await registerAndGetCookies(email);

      const response = await logout(
        requestWithCookies(
          "http://localhost/api/v1/auth/logout",
          { [REFRESH_TOKEN_COOKIE]: refreshToken },
          { method: "POST" },
        ),
        ctx,
      );

      expect(response.status).toBe(204);
      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${ACCESS_TOKEN_COOKIE}=;`);
      expect(setCookie).toContain(`${REFRESH_TOKEN_COOKIE}=;`);

      // The revoked refresh token can no longer be used to get a new session.
      const refreshAttempt = await refresh(
        requestWithCookies(
          "http://localhost/api/v1/auth/refresh",
          { [REFRESH_TOKEN_COOKIE]: refreshToken },
          { method: "POST" },
        ),
        ctx,
      );
      expect(refreshAttempt.status).toBe(401);
    });
  });
});
