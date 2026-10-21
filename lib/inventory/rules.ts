// Inventory model rules shared by later modules. Mirrors the CHECK constraints
// in the init migration (the database remains the final integrity layer).
import type { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";

/** BMN is an individual asset: quantity is always exactly 1. */
export const BMN_QUANTITY = 1;

export const BMN_STATUSES = [
  "AVAILABLE",
  "IN_USE",
  "BORROWED",
  "UNDER_MAINTENANCE",
  "LOST",
  "DISPOSED",
] as const satisfies readonly ItemStatus[];

export const ATK_STATUSES = ["IN_STOCK", "OUT_OF_STOCK", "DISPOSED"] as const satisfies readonly ItemStatus[];

export function isStatusAllowedForType(type: ItemType, status: ItemStatus): boolean {
  const allowed: readonly ItemStatus[] = type === "BMN" ? BMN_STATUSES : ATK_STATUSES;
  return allowed.includes(status);
}

/** ATK stock status derived from quantity (quantity > 0 → IN_STOCK, 0 → OUT_OF_STOCK). */
export function atkStockStatus(quantity: number): "IN_STOCK" | "OUT_OF_STOCK" {
  return quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
}
