export interface ChartRow {
  label: string;
  count: number;
}

/**
 * Largest rows first, zero rows dropped. Beyond `limit` rows the rest are merged into one "Lainnya" row,
 * so a chart never grows with the number of categories.
 */
export function topWithOther(rows: ChartRow[], limit: number): ChartRow[] {
  const sorted = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id"));
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((sum, r) => sum + r.count, 0);
  return [...head, { label: "Lainnya", count: rest }];
}

/** Share of `part` in `total` as a whole percentage. A non-zero part never shows as 0%; 0 when total is 0. */
export function percent(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.max(1, Math.round((part / total) * 100));
}

/** Bar width (0 to 100) for `part` in `total`, to one decimal. A non-zero part always gets at least 1 so it stays visible. */
export function barShare(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round((part / total) * 1000) / 10));
}
