import { describe, expect, it, beforeEach } from "vitest";
import { loadEnv, resetEnvCache } from "@/core/config/env";

const validEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/learnx?schema=public",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
};

describe("loadEnv", () => {
  beforeEach(() => {
    resetEnvCache();
  });

  it("parses a valid environment", () => {
    const env = loadEnv(validEnv);

    expect(env.NODE_ENV).toBe("test");
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.JWT_ACCESS_SECRET).toBe(validEnv.JWT_ACCESS_SECRET);
    expect(env.JWT_REFRESH_SECRET).toBe(validEnv.JWT_REFRESH_SECRET);
  });

  it("defaults NODE_ENV to development when missing", () => {
    const { NODE_ENV: _NODE_ENV, ...rest } = validEnv;
    const env = loadEnv(rest);

    expect(env.NODE_ENV).toBe("development");
  });

  it("throws a descriptive error when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _DATABASE_URL, ...rest } = validEnv;

    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("throws when DATABASE_URL is not a valid URL", () => {
    expect(() => loadEnv({ ...validEnv, DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });

  it("throws when JWT_ACCESS_SECRET is shorter than 32 characters", () => {
    expect(() => loadEnv({ ...validEnv, JWT_ACCESS_SECRET: "too-short" })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it("throws when JWT_REFRESH_SECRET is shorter than 32 characters", () => {
    expect(() => loadEnv({ ...validEnv, JWT_REFRESH_SECRET: "too-short" })).toThrow(
      /JWT_REFRESH_SECRET/,
    );
  });

  it("rejects an unknown NODE_ENV value", () => {
    expect(() => loadEnv({ ...validEnv, NODE_ENV: "staging" })).toThrow();
  });

  it("caches the parsed result across calls", () => {
    const first = loadEnv(validEnv);
    const second = loadEnv({ ...validEnv, DATABASE_URL: "postgresql://other/db" });

    expect(second).toBe(first);
  });
});
