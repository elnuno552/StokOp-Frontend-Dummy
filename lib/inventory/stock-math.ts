// The arithmetic of an ATK stock movement, kept pure so its rules can be tested without a database.
// Quantities are DECIMAL(18,3) in the database, so results are rounded to 3 decimals.

export type StockKind = "IN" | "OUT" | "ADJUSTMENT";

export type StockChange =
  | { ok: true; after: number; moved: number }
  | { ok: false; reason: "INSUFFICIENT" | "NO_CHANGE" };

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * IN adds `quantity`; OUT removes it and never goes below zero;
 * ADJUSTMENT sets the stock to `quantity` (the counted amount) and needs an actual difference.
 */
export function computeStockChange(kind: StockKind, before: number, quantity: number): StockChange {
  if (kind === "IN") return { ok: true, after: round3(before + quantity), moved: round3(quantity) };
  if (kind === "OUT") {
    if (quantity > before) return { ok: false, reason: "INSUFFICIENT" };
    return { ok: true, after: round3(before - quantity), moved: round3(quantity) };
  }
  const moved = round3(Math.abs(quantity - before));
  if (moved === 0) return { ok: false, reason: "NO_CHANGE" };
  return { ok: true, after: round3(quantity), moved };
}
