import { POST as register } from "@/app/api/v1/auth/register/route";
import { ACCESS_TOKEN_COOKIE } from "@/modules/auth/auth.cookies";

export const routeCtx = { params: Promise.resolve({}) };

export function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Extracts a cookie's value from a Set-Cookie response header. */
export function extractCookieValue(setCookieHeader: string, name: string): string {
  const match = new RegExp(`${name}=([^;]+)`).exec(setCookieHeader);
  if (!match) {
    throw new Error(`Cookie ${name} not found in Set-Cookie header`);
  }
  return match[1];
}

export function requestWithCookies(
  url: string,
  cookies: Record<string, string>,
  init?: { method?: string; body?: unknown },
): Request {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  return new Request(url, {
    method: init?.method ?? "GET",
    headers: {
      cookie: cookieHeader,
      ...(init?.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/** Registers a fresh user for a test and returns their access token cookie value. */
export async function registerTestUser(
  email: string,
  overrides: { name?: string; password?: string } = {},
): Promise<{ accessToken: string; userId: string }> {
  const response = await register(
    jsonRequest("http://localhost/api/v1/auth/register", {
      email,
      password: overrides.password ?? "correct-password",
      name: overrides.name ?? "Test User",
    }),
    routeCtx,
  );
  const body = await response.json();
  const setCookie = response.headers.get("set-cookie") ?? "";

  return {
    accessToken: extractCookieValue(setCookie, ACCESS_TOKEN_COOKIE),
    userId: body.data.user.id,
  };
}

/** Builds a Request carrying the access token cookie, for use with requireUser()-gated routes. */
export function authenticatedRequest(
  url: string,
  accessToken: string,
  init?: { method?: string; body?: unknown },
): Request {
  return requestWithCookies(url, { [ACCESS_TOKEN_COOKIE]: accessToken }, init);
}
