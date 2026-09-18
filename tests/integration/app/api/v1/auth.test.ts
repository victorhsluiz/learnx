import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { prisma } from "@/core/database/prisma";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/modules/auth/auth.cookies";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({}) };

describe("POST /api/v1/auth/register", () => {
  afterEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user and sets httpOnly auth cookies", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/v1/auth/register", {
        email: "integration@learnx.dev",
        password: "correct-password",
        name: "Integration Test",
      }),
      ctx,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.user).toMatchObject({
      email: "integration@learnx.dev",
      name: "Integration Test",
    });
    expect(body.data.user.passwordHash).toBeUndefined();

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ACCESS_TOKEN_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/i);

    const storedUser = await prisma.user.findUnique({
      where: { email: "integration@learnx.dev" },
    });
    expect(storedUser).not.toBeNull();

    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: storedUser?.id },
    });
    expect(storedTokens).toHaveLength(1);
  });

  it("returns 409 for a duplicate email", async () => {
    const payload = {
      email: "dup@learnx.dev",
      password: "correct-password",
      name: "First",
    };
    await register(jsonRequest("http://localhost/api/v1/auth/register", payload), ctx);

    const response = await register(
      jsonRequest("http://localhost/api/v1/auth/register", {
        ...payload,
        name: "Second",
      }),
      ctx,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 422 for an invalid payload", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/v1/auth/register", {
        email: "not-an-email",
        password: "short",
        name: "",
      }),
      ctx,
    );

    expect(response.status).toBe(422);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await register(
      jsonRequest("http://localhost/api/v1/auth/register", {
        email: "login-test@learnx.dev",
        password: "correct-password",
        name: "Login Test",
      }),
      ctx,
    );
  });

  afterEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("logs in with correct credentials and sets auth cookies", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/v1/auth/login", {
        email: "login-test@learnx.dev",
        password: "correct-password",
      }),
      ctx,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.email).toBe("login-test@learnx.dev");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${REFRESH_TOKEN_COOKIE}=`);
  });

  it("returns 401 for a wrong password", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/v1/auth/login", {
        email: "login-test@learnx.dev",
        password: "wrong-password",
      }),
      ctx,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for an unknown email", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/v1/auth/login", {
        email: "nobody@learnx.dev",
        password: "whatever",
      }),
      ctx,
    );

    expect(response.status).toBe(401);
  });
});
