import type { AuthContext } from "@/lib/auth/guards";
import { PENDING_NOTICE, approvalRequired } from "@/lib/approvals/store";
import type { WorkflowResult } from "@/lib/borrowing/service";
import { itemById } from "@/lib/mock/data";
import { DEMO_NOTICE } from "@/lib/mock/helpers";
import { canMutateInventory } from "@/lib/permissions";
import type { DecideDisposalInput, MarkFoundInput, MarkLostInput, ProposeDisposalInput } from "@/validations/disposal";

const fail = (error: string): WorkflowResult => ({ ok: false, error });

function bmnOrError(actor: AuthContext, itemId: string): WorkflowResult | null {
  const item = itemById(itemId);
  if (!item) return fail("Barang tidak ditemukan atau sudah dihapus.");
  if (item.type !== "BMN") return fail("Hanya aset BMN yang dapat diproses.");
  if (!canMutateInventory(actor.role, "BMN")) return fail("Anda tidak berwenang mengelola aset BMN.");
  return null;
}

// Demo build: access is checked, nothing is stored.
export async function markLost(actor: AuthContext, itemId: string, _input: MarkLostInput, _ipAddress: string | null): Promise<WorkflowResult> {
  return bmnOrError(actor, itemId) ?? { ok: true, notice: DEMO_NOTICE };
}

export async function markFound(actor: AuthContext, itemId: string, _input: MarkFoundInput, _ipAddress: string | null): Promise<WorkflowResult> {
  return bmnOrError(actor, itemId) ?? { ok: true, notice: DEMO_NOTICE };
}

export async function proposeDisposal(actor: AuthContext, itemId: string, _input: ProposeDisposalInput, _ipAddress: string | null): Promise<WorkflowResult> {
  return bmnOrError(actor, itemId) ?? { ok: true, notice: DEMO_NOTICE };
}

export async function decideDisposal(actor: AuthContext, _disposalId: string, _input: DecideDisposalInput, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!canMutateInventory(actor.role, "BMN")) return fail("Anda tidak berwenang mengelola aset BMN.");
  if (await approvalRequired(actor, "DISPOSAL_DECISION")) return { ok: true, notice: PENDING_NOTICE };
  return { ok: true, notice: DEMO_NOTICE };
}

export async function completeDisposal(actor: AuthContext, _disposalId: string, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!canMutateInventory(actor.role, "BMN")) return fail("Anda tidak berwenang mengelola aset BMN.");
  return { ok: true, notice: DEMO_NOTICE };
}

export async function cancelDisposal(actor: AuthContext, _disposalId: string, _ipAddress: string | null): Promise<WorkflowResult> {
  if (!canMutateInventory(actor.role, "BMN")) return fail("Anda tidak berwenang mengelola aset BMN.");
  return { ok: true, notice: DEMO_NOTICE };
}
