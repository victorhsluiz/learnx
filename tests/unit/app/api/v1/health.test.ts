import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";

describe("GET /api/v1/health", () => {
  it("responds with status ok and a timestamp", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("ok");
    expect(new Date(body.data.timestamp).toString()).not.toBe("Invalid Date");
  });
});
