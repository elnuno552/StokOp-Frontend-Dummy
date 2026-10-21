// Numbered pagination without I/O (DESIGN.md §32).

/** Page numbers to show: first, last, and the neighbours of the current page, with "gap" where pages are skipped. */
export function pageList(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (["gap", p] as const) : [p]));
}

/** First and last row number shown on a page (both 0 when there are no rows). */
export function pageRange(page: number, pageSize: number, total: number): { first: number; last: number } {
  if (total === 0) return { first: 0, last: 0 };
  return { first: (page - 1) * pageSize + 1, last: Math.min(page * pageSize, total) };
}
