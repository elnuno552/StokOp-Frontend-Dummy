import type { AuthContext } from "@/lib/auth/guards";
import { itemById } from "@/lib/mock/data";
import { canMutateInventory } from "@/lib/permissions";
import type { UpdateAtkInput, UpdateBmnInput, UpdateItemField } from "@/validations/item-update";

export type UpdateItemResult =
  | { ok: true; changed: boolean }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<UpdateItemField, string>> };

export type DeleteItemResult = { ok: true; code: string } | { ok: false; error: string };

// Demo build: edits are accepted and not stored.
export async function updateItem(
  actor: AuthContext,
  id: string,
  _input: UpdateBmnInput | UpdateAtkInput,
  _ipAddress: string | null,
  _customRaw: Record<string, string> = {},
): Promise<UpdateItemResult> {
  const item = itemById(id);
  if (!item) return { ok: false, error: "Barang tidak ditemukan atau sudah dihapus." };
  if (!canMutateInventory(actor.role, item.type)) return { ok: false, error: `Anda tidak berwenang mengubah barang ${item.type}.` };
  return { ok: true, changed: true };
}

export async function deleteItem(actor: AuthContext, id: string, _ipAddress: string | null): Promise<DeleteItemResult> {
  const item = itemById(id);
  if (!item) return { ok: false, error: "Barang tidak ditemukan atau sudah dihapus." };
  if (!canMutateInventory(actor.role, item.type)) return { ok: false, error: `Anda tidak berwenang menghapus barang ${item.type}.` };
  if (item.status === "BORROWED") return { ok: false, error: "Barang sedang dipinjam. Kembalikan dulu sebelum menghapus." };
  if (item.status === "UNDER_MAINTENANCE") return { ok: false, error: "Barang sedang dalam perawatan. Selesaikan atau batalkan perawatan dulu." };
  return { ok: true, code: item.code };
}
