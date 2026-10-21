// Custom field values in a spreadsheet import, without I/O: which column belongs to which field, and how a cell's text
// is cleaned up before validateCustomValues sees it. The leniency lives here (not in rules.ts) because rules.ts also
// validates the forms, where input is typed by hand.

import { normalizeDate } from "@/lib/inventory/import-map";
import type { FieldDef } from "./rules";

/** readSpreadsheet stores a column it does not know as `cf:<header>`; validateImport decides whether a field owns it. */
export const CUSTOM_HEADER_PREFIX = "cf:";

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** True when a spreadsheet header names the field: "Label", or "Label (Kategori)" as the all-categories export writes it. */
export function matchCustomHeader(header: string, def: Pick<FieldDef, "label">, categoryName?: string): boolean {
  const h = squash(header);
  if (h === "") return false;
  return h === squash(def.label) || (categoryName !== undefined && h === squash(`${def.label} (${categoryName})`));
}

const YES = new Set(["ya", "yes", "y", "true", "1", "on"]);
const NO = new Set(["tidak", "no", "n", "false", "0", "off"]);

/** Cell text in the shape validateCustomValues expects; anything it cannot interpret is returned as typed so validation reports it. */
export function normalizeCustomImportCell(def: Pick<FieldDef, "type" | "options">, text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  switch (def.type) {
    case "DATE":
      return normalizeDate(trimmed);
    case "BOOLEAN": {
      const lower = trimmed.toLowerCase();
      if (YES.has(lower)) return "ya";
      if (NO.has(lower)) return "tidak";
      return trimmed;
    }
    case "SELECT":
      return def.options.find((option) => option === trimmed) ?? def.options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    default:
      return trimmed;
  }
}

/** Raw values for one row, keyed by field id, from the record's `cf:` columns that belong to this category's fields. */
export function collectCustomRaw(
  defs: readonly Pick<FieldDef, "id" | "label" | "type" | "options">[],
  categoryName: string | undefined,
  record: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!key.startsWith(CUSTOM_HEADER_PREFIX) || value === undefined) continue;
    const header = key.slice(CUSTOM_HEADER_PREFIX.length);
    for (const def of defs) {
      if (matchCustomHeader(header, def, categoryName)) raw[def.id] = normalizeCustomImportCell(def, value);
    }
  }
  return raw;
}

/** Headers (without the prefix) found in the records that no field of any category claims: they are ignored, and the preview says so. */
export function unclaimedCustomHeaders(
  records: readonly Readonly<Record<string, string | undefined>>[],
  fields: readonly { label: string; categoryName: string }[],
): string[] {
  const seen = new Set<string>();
  for (const record of records) for (const key of Object.keys(record)) if (key.startsWith(CUSTOM_HEADER_PREFIX)) seen.add(key.slice(CUSTOM_HEADER_PREFIX.length));
  return [...seen].filter((header) => !fields.some((f) => matchCustomHeader(header, { label: f.label }, f.categoryName)));
}
