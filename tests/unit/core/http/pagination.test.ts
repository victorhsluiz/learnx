import { describe, expect, it } from "vitest";
import { buildPaginationMeta, parsePagination, DEFAULT_PAGE_SIZE } from "@/core/http/pagination";

describe("parsePagination", () => {
  it("defaults to page 1 and the default page size when params are absent", () => {
    const params = parsePagination(new URLSearchParams());

    expect(params).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("parses valid page/pageSize values", () => {
    const params = parsePagination(new URLSearchParams({ page: "3", pageSize: "10" }));

    expect(params).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });

  it("clamps pageSize above the maximum back to the default", () => {
    const params = parsePagination(new URLSearchParams({ pageSize: "1000" }));

    expect(params.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("falls back to defaults for non-numeric input instead of throwing", () => {
    const params = parsePagination(new URLSearchParams({ page: "not-a-number" }));

    expect(params).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("falls back to defaults for zero/negative page", () => {
    const params = parsePagination(new URLSearchParams({ page: "0" }));

    expect(params.page).toBe(1);
  });
});

describe("buildPaginationMeta", () => {
  it("computes totalPages from total and pageSize", () => {
    const params = parsePagination(new URLSearchParams({ page: "1", pageSize: "10" }));

    expect(buildPaginationMeta(params, 25)).toEqual({
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("returns at least 1 total page even when total is 0", () => {
    const params = parsePagination(new URLSearchParams({ page: "1", pageSize: "10" }));

    expect(buildPaginationMeta(params, 0).totalPages).toBe(1);
  });
});
