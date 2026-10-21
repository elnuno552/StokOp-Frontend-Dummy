import type { AuthContext } from "@/lib/auth/guards";
import { itemById } from "@/lib/mock/data";
import { canMutateInventory } from "@/lib/permissions";
import type { z } from "zod";
import type { createNoteSchema } from "@/validations/note";

export type AddNoteResult = { ok: true } | { ok: false; error: string };

/** Demo build: the note is accepted and not stored. */
export async function addItemNote(
  actor: AuthContext,
  itemId: string,
  _input: z.output<typeof createNoteSchema>,
  _ipAddress: string | null,
): Promise<AddNoteResult> {
  const item = itemById(itemId);
  if (!item) return { ok: false, error: "Barang tidak ditemukan." };
  if (!canMutateInventory(actor.role, item.type)) return { ok: false, error: `Anda tidak berwenang menambah catatan pada barang ${item.type}.` };
  return { ok: true };
}
