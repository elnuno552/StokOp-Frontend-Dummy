// Parsing and diffing of minimum-stock input, without I/O.

export type MinimumParse = { ok: true; value: number | null } | { ok: false };

/** Blank means "no minimum". "2,5" (comma, up to 3 decimals) or "2.5" (dot, up to 2); "1.500" is refused as ambiguous. */
export function parseMinimum(raw: string): MinimumParse {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d{1,12}(,\d{1,3}|\.\d{1,2})?$/.test(text)) return { ok: false };
  return { ok: true, value: Math.round(Number(text.replace(",", ".")) * 1000) / 1000 };
}

export interface MinimumRow {
  id: string;
  categoryId: string | null;
  minimum: number | null;
}

/**
 * New minimums for the items whose value changed, plus (when `applyDefaults`) the category default for every item
 * that ends up with no minimum. `submitted` holds the raw text per item id, `defaults` the parsed default per category.
 */
export function planMinimumChanges(
  rows: readonly MinimumRow[],
  submitted: Readonly<Record<string, string>>,
  defaults: Readonly<Record<string, number | null>>,
  applyDefaults: boolean,
): { changes: { id: string; minimum: number | null }[]; invalid: string[] } {
  const changes: { id: string; minimum: number | null }[] = [];
  const invalid: string[] = [];
  for (const row of rows) {
    let next: number | null = row.minimum;
    if (row.id in submitted) {
      const parsed = parseMinimum(submitted[row.id]);
      if (!parsed.ok) {
        invalid.push(row.id);
        continue;
      }
      next = parsed.value;
    }
    if (applyDefaults && next === null && row.categoryId) next = defaults[row.categoryId] ?? null;
    if (next !== row.minimum) changes.push({ id: row.id, minimum: next });
  }
  return { changes, invalid };
}
