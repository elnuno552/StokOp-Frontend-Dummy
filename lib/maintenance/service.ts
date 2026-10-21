import type { AuthContext } from "@/lib/auth/guards";
import type { WorkflowResult } from "@/lib/borrowing/service";
import { itemById, maintenance } from "@/lib/mock/data";
import { DEMO_NOTICE } from "@/lib/mock/helpers";
import { canMutateInventory } from "@/lib/permissions";
import type { CompleteMaintenanceInput, MaintenanceOp, ReportMaintenanceInput } from "@/validations/workflow";

const fail = (error: string): WorkflowResult => ({ ok: false, error });

// Demo build: access is checked, nothing is stored.
export async function reportMaintenance(actor: AuthContext, itemId: string, _input: ReportMaintenanceInput, _ipAddress: string | null): Promise<WorkflowResult> {
  const item = itemById(itemId);
  if (!item) return fail("Barang tidak ditemukan atau sudah dihapus.");
  if (!canMutateInventory(actor.role, item.type)) return fail("Anda tidak berwenang mengelola perawatan barang ini.");
  return { ok: true, notice: DEMO_NOTICE };
}

export async function updateMaintenance(
  actor: AuthContext,
  recordId: string,
  _op: MaintenanceOp,
  _complete: CompleteMaintenanceInput | null,
  _ipAddress: string | null,
): Promise<WorkflowResult> {
  const record = maintenance.find((m) => m.id === recordId);
  if (!record) return fail("Data perawatan tidak ditemukan.");
  const item = itemById(record.itemId);
  if (!item || !canMutateInventory(actor.role, item.type)) return fail("Anda tidak berwenang mengelola perawatan ini.");
  return { ok: true, notice: DEMO_NOTICE };
}
