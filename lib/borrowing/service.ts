import type { AuthContext } from "@/lib/auth/guards";
import { DEMO_NOTICE } from "@/lib/mock/helpers";
import { borrowings, itemById } from "@/lib/mock/data";
import { canApproveBorrowing, canMutateInventory } from "@/lib/permissions";
import { decideBorrowStart } from "@/lib/borrowing/rules";
import type { BorrowInput, RejectBorrowInput, ReturnInput } from "@/validations/workflow";

export type WorkflowResult = { ok: true; notice?: string } | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

const fail = (error: string): WorkflowResult => ({ ok: false, error });

// Demo build: the workflow rules that depend on access are kept; nothing is stored.
export async function borrowItem(actor: AuthContext, itemId: string, _input: BorrowInput, _ipAddress: string | null): Promise<WorkflowResult> {
  const item = itemById(itemId);
  if (!item) return fail("Barang tidak ditemukan atau sudah dihapus.");
  if (item.type !== "BMN") return fail("Hanya aset BMN yang dapat dipinjamkan.");
  if (!canMutateInventory(actor.role, "BMN")) return fail("Anda tidak berwenang meminjamkan aset BMN.");
  if (item.status !== "AVAILABLE" && item.status !== "IN_USE") return fail("Barang tidak dapat dipinjam pada statusnya saat ini.");
  return { ok: true, notice: decideBorrowStart(actor.role) === "PENDING" ? `Permintaan peminjaman dicatat dan menunggu persetujuan. ${DEMO_NOTICE}` : DEMO_NOTICE };
}

export async function approveBorrowing(actor: AuthContext, _borrowingId: string, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!canApproveBorrowing(actor.role)) return fail("Peran Anda tidak berwenang menyetujui peminjaman.");
  return { ok: true, notice: DEMO_NOTICE };
}

export async function rejectBorrowing(actor: AuthContext, _borrowingId: string, _input: RejectBorrowInput, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!canApproveBorrowing(actor.role)) return fail("Peran Anda tidak berwenang menolak peminjaman.");
  return { ok: true, notice: DEMO_NOTICE };
}

export async function cancelBorrowing(_actor: AuthContext, borrowingId: string, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!borrowings.some((b) => b.id === borrowingId)) return fail("Data peminjaman tidak ditemukan.");
  return { ok: true, notice: DEMO_NOTICE };
}

export async function returnItem(actor: AuthContext, borrowingId: string, _input: ReturnInput, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!canMutateInventory(actor.role, "BMN")) return fail("Anda tidak berwenang mencatat pengembalian aset BMN.");
  if (!borrowings.some((b) => b.id === borrowingId)) return fail("Data peminjaman tidak ditemukan.");
  return { ok: true, notice: DEMO_NOTICE };
}
