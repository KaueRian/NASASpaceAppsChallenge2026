import type { PaginationMetadata } from "../types/investigation.ts";

export const MAX_PAGE_NUMBER = 1000;

export type PageParamValidationResult =
  | { ok: true; page?: number }
  | { ok: false; message: string };

/**
 * Validates an optional 1-based `?page=` query parameter.
 */
export function parsePositivePageParam(raw?: string): PageParamValidationResult {
  if (raw === undefined || raw.trim() === "") {
    return { ok: true, page: undefined };
  }
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_NUMBER) {
    return {
      ok: false,
      message: `page filter must be an integer between 1 and ${MAX_PAGE_NUMBER}.`,
    };
  }
  return { ok: true, page: parsed };
}

/**
 * Clamps a 1-based page index cleanly within `[1, max(1, totalPages)]`.
 */
export function clampPage(page: number, totalPages: number): number {
  const upperBound = Math.max(1, Math.floor(totalPages));
  const safePage = Number.isFinite(page) ? Math.floor(page) : 1;
  return Math.min(Math.max(1, safePage), upperBound);
}

/**
 * Builds canonical pagination metadata from total item count, current page, and page size.
 */
export function buildPaginationMetadata(
  totalItems: number,
  page: number,
  pageSize: number,
): PaginationMetadata {
  const safeTotal = Math.max(0, Math.floor(totalItems));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / safePageSize) : 0;
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;

  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems: safeTotal,
    totalPages,
    hasPrev: safeTotal > 0 && safePage > 1,
    hasNext: safePage < totalPages,
  };
}

/**
 * Slices a read-only array for the requested 1-based page and computes matching metadata.
 */
export function paginateSlice<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { items: T[]; pagination: PaginationMetadata } {
  const pagination = buildPaginationMetadata(items.length, page, pageSize);
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  return {
    items: items.slice(startIndex, startIndex + pagination.pageSize),
    pagination,
  };
}

/**
 * Computes 1-based display bounds (`start–end of total`) for a pagination snapshot.
 */
export function getPaginationRange(pagination: PaginationMetadata): {
  start: number;
  end: number;
  total: number;
} {
  const { totalItems, page, pageSize } = pagination;
  if (totalItems <= 0) {
    return { start: 0, end: 0, total: 0 };
  }
  const offset = (page - 1) * pageSize;
  if (offset >= totalItems) {
    return { start: 0, end: 0, total: totalItems };
  }
  return {
    start: offset + 1,
    end: Math.min(totalItems, offset + pageSize),
    total: totalItems,
  };
}

/**
 * Builds a bounded list of page numbers and ellipsis markers so UI paginators never overflow.
 */
export function buildVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const safeCurrent = clampPage(currentPage, totalPages);
  const tokens: Array<number | "ellipsis"> = [1];

  let windowStart = Math.max(2, safeCurrent - 1);
  let windowEnd = Math.min(totalPages - 1, safeCurrent + 1);

  if (safeCurrent <= 3) {
    windowStart = 2;
    windowEnd = 3;
  } else if (safeCurrent >= totalPages - 2) {
    windowStart = totalPages - 2;
    windowEnd = totalPages - 1;
  }

  if (windowStart > 2) {
    tokens.push("ellipsis");
  }
  for (let p = windowStart; p <= windowEnd; p++) {
    tokens.push(p);
  }
  if (windowEnd < totalPages - 1) {
    tokens.push("ellipsis");
  }

  tokens.push(totalPages);
  return tokens;
}
