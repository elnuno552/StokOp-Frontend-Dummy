import type { AuthContext } from "@/lib/auth/guards";
import { approvalRequired } from "@/lib/approvals/store";
import { itemById } from "@/lib/mock/data";
import { canMutateInventory } from "@/lib/permissions";
import type { MovementField, MovementInput } from "@/validations/movement";

export type MovementResult =
  | { ok: true; count: number; /** Requests filed for approval instead of being applied. */ pending?: number }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<MovementField, string>> };

/** A rule violation that is shown to the user. */
export class MovementError extends Error {
  constructor(
    message: string,
    readonly field?: MovementField,
  ) {
    super(message);
  }
}

/**
 * Demo build: checks the same basic rules as the real service (access, stock on hand) and reports success,
 * but stores nothing.
 */
export async function applyMovement(actor: AuthContext, input: MovementInput, _ipAddress: string | null): Promise<MovementResult> {
  const targets = input.itemIds.map((id) => itemById(id));
  if (targets.some((item) => !item)) return { ok: false, error: "Barang tidak ditemukan atau sudah dihapus." };
  for (const item of targets) {
    if (!canMutateInventory(actor.role, item!.type)) return { ok: false, error: `Anda tidak berwenang mengubah barang ${item!.type}.` };
  }

  if (input.kind === "OUT") {
    const short = targets.find((item) => item!.type === "ATK" && item!.quantity < input.quantity);
    if (short) return { ok: false, fieldErrors: { quantity: `Stok ${short.name} tidak cukup (tersisa ${short.quantity}).` } };
  }

  if ((input.kind === "ADJUSTMENT" && (await approvalRequired(actor, "STOCK_ADJUSTMENT"))) || (input.kind === "TRANSFER" && (await approvalRequired(actor, "BMN_TRANSFER")))) {
    return { ok: true, count: 0, pending: input.itemIds.length };
  }
  return { ok: true, count: input.itemIds.length };
}
