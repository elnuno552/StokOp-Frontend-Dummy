// Parsing of numbers typed by people on the RAB screen. Pure, so it is tested directly.
//
// Money is written the Indonesian way: "16.900" is sixteen thousand nine hundred, "1.500.000,50" has a
// comma for the decimals. Quantities follow the stock rule instead: a dot followed by exactly three digits
// is ambiguous there and refused (see validations/movement.ts).

export type Parsed = { ok: true; value: number } | { ok: false };

/** "16900", "16.900", "1.500.000", "1.500.000,5", "16900.5" (dot with 1-2 digits = decimals). */
export function parseMoney(input: string): Parsed {
  const text = input.trim();
  if (text === "") return { ok: false };
  // Thousands dots (groups of exactly 3 digits), optional comma decimals.
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) {
    return { ok: true, value: Number(text.replace(/\./g, "").replace(",", ".")) };
  }
  // Plain digits with an optional decimal part (comma, or a dot with at most 2 digits).
  if (/^\d{1,15}(,\d{1,2}|\.\d{1,2})?$/.test(text)) {
    return { ok: true, value: Number(text.replace(",", ".")) };
  }
  return { ok: false };
}

/** Volume: "3", "2,5" (comma up to 3 decimals) or "2.5" (dot up to 2). "1.500" is refused. */
export function parseVolume(input: string): Parsed {
  const text = input.trim();
  if (!/^\d{1,12}(,\d{1,3}|\.\d{1,2})?$/.test(text)) return { ok: false };
  return { ok: true, value: Number(text.replace(",", ".")) };
}

/** Only web links, so the value can never be a script or a file path. */
export function parseLink(input: string): { ok: true; value: string | null } | { ok: false } {
  const text = input.trim();
  if (text === "") return { ok: true, value: null };
  if (text.length > 2000) return { ok: false };
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false };
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false };
  }
}

const MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

/** "Tanggal 31 Agustus 2026" (or "31 Agustus 2026") to "2026-08-31". Null when it does not read as a date. */
export function parseIndonesianDate(input: string): string | null {
  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(input);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  const iso = `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
