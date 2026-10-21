// Custom fields without I/O: validation of submitted values, merging into an item's stored values, display text.
// Values are stored per item as { [fieldId]: string | number | boolean } (items.custom_values).

export const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Teks",
  NUMBER: "Angka",
  DATE: "Tanggal",
  SELECT: "Pilihan",
  BOOLEAN: "Ya / Tidak",
};

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
}

export type CustomValue = string | number | boolean;
export type CustomValues = Record<string, CustomValue>;

export const TEXT_MAX = 500;
export const OPTION_MAX = 100;
export const OPTIONS_MAX = 50;

/** Form field name of a custom field. */
export const customFieldKey = (id: string) => `cf:${id}`;

/** Pull the raw custom field values out of submitted form data, keyed by field id. */
export function collectCustomInput(form: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(form)) {
    if (key.startsWith("cf:") && typeof value === "string") out[key.slice(3)] = value;
  }
  return out;
}

const NUMBER_PATTERN = /^-?\d{1,15}(,\d{1,6}|\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(text: string): boolean {
  if (!DATE_PATTERN.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

/**
 * Validate the submitted raw values against the fields asked for. Blank means "not filled": it is an error only for a
 * required field. Errors are keyed by the form field name (`cf:<id>`) so the form can show them next to the input.
 */
export function validateCustomValues(
  defs: readonly FieldDef[],
  raw: Readonly<Record<string, string | undefined>>,
): { values: CustomValues; errors: Record<string, string> } {
  const values: CustomValues = {};
  const errors: Record<string, string> = {};

  for (const def of defs) {
    const key = customFieldKey(def.id);
    const text = (raw[def.id] ?? "").trim();
    if (text === "") {
      if (def.required) errors[key] = `${def.label} wajib diisi.`;
      continue;
    }
    switch (def.type) {
      case "TEXT":
        if (text.length > TEXT_MAX) errors[key] = `${def.label} maksimal ${TEXT_MAX} karakter.`;
        else values[def.id] = text;
        break;
      case "NUMBER":
        if (!NUMBER_PATTERN.test(text)) errors[key] = `${def.label} harus berupa angka. Desimal dengan koma, tanpa titik ribuan.`;
        else values[def.id] = Number(text.replace(",", "."));
        break;
      case "DATE":
        if (!isRealDate(text)) errors[key] = `${def.label} bukan tanggal yang valid.`;
        else values[def.id] = text;
        break;
      case "SELECT":
        if (!def.options.includes(text)) errors[key] = `Pilih salah satu pilihan ${def.label}.`;
        else values[def.id] = text;
        break;
      case "BOOLEAN": {
        const lower = text.toLowerCase();
        if (["ya", "true", "on"].includes(lower)) values[def.id] = true;
        else if (["tidak", "false", "off"].includes(lower)) values[def.id] = false;
        else errors[key] = `Pilih Ya atau Tidak untuk ${def.label}.`;
        break;
      }
    }
  }
  return { values, errors };
}

/**
 * New stored values after an edit: values of the fields that were asked for are replaced (cleared when left blank),
 * everything else (archived fields, fields of another category) is kept untouched.
 */
export function mergeCustomValues(existing: unknown, asked: readonly FieldDef[], submitted: CustomValues): CustomValues {
  const base: CustomValues = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...(existing as CustomValues) } : {};
  for (const def of asked) delete base[def.id];
  return { ...base, ...submitted };
}

/** Read a stored value as a given field's type; anything that does not fit is treated as empty. */
export function readCustomValue(def: Pick<FieldDef, "type">, stored: unknown): CustomValue | undefined {
  switch (def.type) {
    case "NUMBER":
      return typeof stored === "number" ? stored : undefined;
    case "BOOLEAN":
      return typeof stored === "boolean" ? stored : undefined;
    default:
      return typeof stored === "string" && stored !== "" ? stored : undefined;
  }
}

/** Text to prefill a form input with: the inverse of what validateCustomValues accepts. */
export function customFormValue(def: Pick<FieldDef, "type">, stored: unknown): string {
  const value = readCustomValue(def, stored);
  if (value === undefined) return "";
  if (def.type === "BOOLEAN") return value ? "ya" : "tidak";
  if (def.type === "NUMBER") return String(value).replace(".", ",");
  return String(value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Text shown for a stored value; "" when empty. */
export function displayCustomValue(def: Pick<FieldDef, "type">, stored: unknown): string {
  const value = readCustomValue(def, stored);
  if (value === undefined) return "";
  switch (def.type) {
    case "BOOLEAN":
      return value ? "Ya" : "Tidak";
    case "NUMBER":
      return String(value).replace(".", ",");
    case "DATE": {
      const [y, m, d] = String(value).split("-").map(Number);
      return `${d} ${MONTHS[m - 1]} ${y}`;
    }
    default:
      return String(value);
  }
}

/** Clean the choices typed one per line: trimmed, no blanks, no duplicates (case-insensitive), within limits. */
export function parseOptions(raw: string): { ok: true; options: string[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const option = line.trim();
    if (option === "") continue;
    if (option.length > OPTION_MAX) return { ok: false, error: `Setiap pilihan maksimal ${OPTION_MAX} karakter.` };
    const key = option.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }
  if (options.length > OPTIONS_MAX) return { ok: false, error: `Maksimal ${OPTIONS_MAX} pilihan.` };
  return { ok: true, options };
}

export interface CustomFilterCondition {
  path: string[];
  equals?: string | number | boolean;
  string_contains?: string;
}

/** The Prisma JSON filter for one custom field value, or null when the input is blank or does not fit the type. */
export function customFilterCondition(def: Pick<FieldDef, "id" | "type" | "options">, raw: string): CustomFilterCondition | null {
  const text = raw.trim();
  if (text === "") return null;
  const path = [def.id];
  switch (def.type) {
    case "TEXT":
      return { path, string_contains: text };
    case "NUMBER":
      return NUMBER_PATTERN.test(text) ? { path, equals: Number(text.replace(",", ".")) } : null;
    case "DATE":
      return isRealDate(text) ? { path, equals: text } : null;
    case "SELECT":
      return def.options.includes(text) ? { path, equals: text } : null;
    case "BOOLEAN":
      return text === "ya" ? { path, equals: true } : text === "tidak" ? { path, equals: false } : null;
  }
}
