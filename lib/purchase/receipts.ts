// Partial receipts of a purchase plan (RAB), without I/O. A plan can be delivered in several parts; each line keeps
// a running total, and the plan is complete once every line has received its full volume.

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export interface ReceiptLineState {
  id: string;
  lineNo: number;
  volume: number;
  /** Running total over all earlier receipts; null before the first one. */
  receivedQuantity: number | null;
}

/** What is still expected on a line (never negative). */
export function remainingQuantity(volume: number, received: number | null): number {
  return Math.max(0, round3(volume - (received ?? 0)));
}

/** RECEIVED once every line has its full volume, otherwise PARTIAL. */
export function planStatusAfterReceipt(lines: { volume: number; receivedQuantity: number | null }[]): "RECEIVED" | "PARTIAL" {
  return lines.every((l) => remainingQuantity(l.volume, l.receivedQuantity) === 0) ? "RECEIVED" : "PARTIAL";
}

export type ReceiptCheck = { ok: true; entries: { lineId: string; quantity: number }[] } | { ok: false; error: string };

/** Validate one delivery: at least one quantity, and no line receiving more than its remaining volume. */
export function checkReceipt(lines: ReceiptLineState[], quantities: Record<string, number>): ReceiptCheck {
  const entries: { lineId: string; quantity: number }[] = [];
  for (const line of lines) {
    const quantity = round3(quantities[line.id] ?? 0);
    if (quantity <= 0) continue;
    const remaining = remainingQuantity(line.volume, line.receivedQuantity);
    if (quantity > remaining) {
      return { ok: false, error: `Baris ${line.lineNo}: jumlah ${quantity} melebihi sisa yang belum diterima (${remaining}).` };
    }
    entries.push({ lineId: line.id, quantity });
  }
  if (entries.length === 0) return { ok: false, error: "Isi jumlah yang diterima pada minimal satu baris." };
  return { ok: true, entries };
}
