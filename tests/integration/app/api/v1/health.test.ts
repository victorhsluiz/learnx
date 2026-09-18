import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";
import { prisma } from "@/core/database/prisma";

describe("GET /api/v1/health", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("responds with status ok and a database connectivity check", async () => {
    const request = new Request("http://localhost/api/v1/health");
    const response = await GET(request, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("ok");
    expect(body.data.database).toEqual({ ok: true });
    expect(new Date(body.data.timestamp).toString()).not.toBe("Invalid Date");
  });
});
