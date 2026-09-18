/**
 * Thin fetch wrapper around the REST API (/api/v1/**), the only HTTP
 * boundary in this app (see docs/architecture.md). Every call:
 *
 *   - sends credentials (httpOnly auth cookies) automatically
 *   - unwraps the standard { data } / { error } envelope
 *   - on a 401, tries POST /auth/refresh once and retries the original
 *     request — this is what keeps a user logged in past their 15-minute
 *     access token without the client tracking token lifetimes itself
 *   - throws ApiError (with the error's code/status) on any non-2xx
 *     response, so callers can branch on `error.code` if needed
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

interface SuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

const API_BASE = "/api/v1";

let refreshPromise: Promise<boolean> | null = null;

/**
 * Calls /auth/refresh at most once concurrently: if several requests hit
 * a 401 around the same time, they all await the same in-flight refresh
 * instead of each triggering their own (which would race to rotate the
 * refresh token and fail for everyone but the first).
 */
function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** Set to false to skip the automatic refresh-and-retry on 401 (used by auth endpoints themselves). */
  retryOn401?: boolean;
}

function buildUrl(path: string, searchParams?: ApiRequestOptions["searchParams"]): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

async function performRequest<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const response = await fetch(buildUrl(path, options.searchParams), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const body = (await response.json().catch(() => null)) as
    SuccessEnvelope<T> | ErrorEnvelope | null;

  if (!response.ok) {
    const error = (body as ErrorEnvelope | null)?.error;
    throw new ApiError(
      error?.message ?? "Request failed",
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
    );
  }

  const success = body as SuccessEnvelope<T>;
  return { data: success.data, meta: success.meta };
}

async function requestWithRetry<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const retryOn401 = options.retryOn401 ?? true;

  try {
    return await performRequest<T>(path, options);
  } catch (error) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;
    if (!isUnauthorized || !retryOn401) {
      throw error;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      throw error;
    }

    return performRequest<T>(path, options);
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { data } = await requestWithRetry<T>(path, options);
  return data;
}

/** Like apiRequest, but also returns the envelope's `meta` (e.g. pagination info). */
export async function apiRequestWithMeta<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  return requestWithRetry<T>(path, options);
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  getWithMeta: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequestWithMeta<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
