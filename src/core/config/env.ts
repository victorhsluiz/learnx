import { z } from "zod";

/**
 * Schema for all environment variables required by the application.
 *
 * This is the single source of truth for env validation: anything the app
 * needs at runtime must be declared here so misconfiguration fails fast at
 * startup instead of surfacing as a confusing error deep in the code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection string"),

  /** Used only by the integration test project; falls back to DATABASE_URL. */
  TEST_DATABASE_URL: z
    .string()
    .url("TEST_DATABASE_URL must be a valid connection string")
    .optional(),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters long"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Formats a ZodError into a human-readable, multi-line message listing
 * every invalid/missing variable, so a misconfigured .env fails with a
 * clear diagnostic instead of a generic stack trace.
 */
function formatEnvError(error: z.ZodError): string {
  const issues = error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  return `Invalid environment variables:\n${issues}`;
}

/**
 * Parses and validates process.env against the schema above.
 *
 * The result is cached after the first successful parse so repeated calls
 * (e.g. across route handlers) don't re-run validation. Call resetEnvCache()
 * in tests to force re-validation against a mutated process.env.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/** Clears the cached env. Intended for test isolation only. */
export function resetEnvCache(): void {
  cachedEnv = undefined;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    return loadEnv()[prop as keyof Env];
  },
});
