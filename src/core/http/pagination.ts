import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export interface PaginationParams {
  page: number;
  pageSize: number;
  /** Convenience value for Prisma's `skip` option. */
  skip: number;
  /** Convenience value for Prisma's `take` option. */
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Parses `page`/`pageSize` from a request's search params, applying
 * sane defaults and clamping pageSize to MAX_PAGE_SIZE. Invalid values
 * (e.g. non-numeric, zero, negative) fall back to the defaults instead of
 * throwing, since pagination params are a convenience, not a hard contract.
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const result = paginationQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  const { page, pageSize } = result.success
    ? result.data
    : { page: 1, pageSize: DEFAULT_PAGE_SIZE };

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/** Builds the `meta` block describing a paginated result set. */
export function buildPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}
