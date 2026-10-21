import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { categories, items } from "@/lib/mock/data";
import { canManageSettings } from "@/lib/permissions";
import { parseMinimum } from "@/lib/stock-minimum/rules";

function assertCan(actor: AuthContext) {
  if (!canManageSettings(actor.role)) throw new AuthorizationError();
}

export interface MinimumItemRow {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  quantity: number;
  minimum: number | null;
}

export interface MinimumGroup {
  categoryId: string | null;
  categoryName: string;
  defaultMinimum: number | null;
  items: MinimumItemRow[];
}

/** Active ATK grouped by category, with each category's default and every item's minimum. */
export async function listMinimums(actor: AuthContext): Promise<MinimumGroup[]> {
  assertCan(actor);
  const atk = items
    .filter((i) => i.type === "ATK" && i.status !== "DISPOSED")
    .sort((a, b) => a.name.localeCompare(b.name, "id") || a.code.localeCompare(b.code));
  const atkCategories = categories.filter((c) => c.type === "ATK").sort((a, b) => a.name.localeCompare(b.name, "id"));

  const view = (i: (typeof atk)[number]): MinimumItemRow => ({ id: i.id, code: i.code, name: i.name, unit: i.unit, quantity: i.quantity, minimum: i.minimumStock });
  const groups: MinimumGroup[] = atkCategories.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    defaultMinimum: c.defaultMinimumStock,
    items: atk.filter((i) => i.categoryId === c.id).map(view),
  }));
  const loose = atk.filter((i) => i.categoryId === null || !atkCategories.some((c) => c.id === i.categoryId));
  if (loose.length > 0) groups.push({ categoryId: null, categoryName: "Tanpa kategori", defaultMinimum: null, items: loose.map(view) });
  return groups.filter((g) => g.items.length > 0 || g.categoryId !== null);
}

export type MinimumResult = { ok: true; changed: number; defaultsChanged: number } | { ok: false; error: string };

/** Demo build: values are validated like the real service and not stored. */
export async function saveMinimums(
  actor: AuthContext,
  input: { items: Record<string, string>; categories: Record<string, string>; applyDefaults: boolean },
  _ipAddress: string | null,
): Promise<MinimumResult> {
  assertCan(actor);
  for (const raw of Object.values(input.categories)) {
    if (!parseMinimum(raw).ok) return { ok: false, error: "Nilai bawaan kategori tidak valid. Gunakan angka, desimal dengan koma (contoh 2,5), tanpa titik ribuan." };
  }
  for (const raw of Object.values(input.items)) {
    if (!parseMinimum(raw).ok) return { ok: false, error: "Stok minimum tidak valid. Gunakan angka, desimal dengan koma (contoh 2,5), tanpa titik ribuan." };
  }
  return { ok: true, changed: Object.keys(input.items).length, defaultsChanged: Object.keys(input.categories).length };
}
