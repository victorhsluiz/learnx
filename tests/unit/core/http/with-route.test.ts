import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { withRoute } from "@/core/http/with-route";
import { ConflictError, NotFoundError, ValidationError } from "@/core/errors";

describe("withRoute", () => {
  it("returns the handler's response unchanged on success", async () => {
    const handler = withRoute(async () => Response.json({ data: { ok: true } }, { status: 200 }));

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { ok: true } });
  });

  it("maps a NotFoundError to a 404 with the standard error envelope", async () => {
    const handler = withRoute(async () => {
      throw new NotFoundError("Word not found");
    });

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: { code: "NOT_FOUND", message: "Word not found" } });
  });

  it("maps a ConflictError, preserving its details", async () => {
    const handler = withRoute(async () => {
      throw new ConflictError("Duplicate word", { field: "hanzi" });
    });

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toEqual({
      code: "CONFLICT",
      message: "Duplicate word",
      details: { field: "hanzi" },
    });
  });

  it("maps a ValidationError (thrown manually) to 422", async () => {
    const handler = withRoute(async () => {
      throw new ValidationError("Invalid payload");
    });

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(422);
  });

  it("maps a ZodError to 422 with per-field issues in details", async () => {
    const schema = z.object({ hanzi: z.string().min(1) });
    const handler = withRoute(async () => {
      schema.parse({ hanzi: "" });
      return Response.json({ data: null });
    });

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "hanzi" })]),
    );
  });

  it("maps an unexpected error to a 500 without leaking its message", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = withRoute(async () => {
      throw new Error("some internal database driver failure with a stack trace");
    });

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
