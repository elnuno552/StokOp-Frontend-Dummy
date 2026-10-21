// Name helpers shared by the staffing-list import and the manual PIC input. Pure: no database, no Excel.

/** Trim and collapse runs of whitespace ("Penata Muda -  III/a" -> "Penata Muda - III/a"). */
export function tidy(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** Key for matching names between two sources: letters and digits only, lower case. */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
