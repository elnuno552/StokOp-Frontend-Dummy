import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { itemById, locationById, opnames, userName } from "@/lib/mock/data";
import { canMutateInventory, canViewOperations } from "@/lib/permissions";
import type { CreateOpnameInput } from "@/validations/opname";

export type OpnameResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function assertCanRead(actor: AuthContext) {
  if (!canViewOperations(actor.role)) throw new AuthorizationError();
}

export function mutableTypes(actor: AuthContext): ItemType[] {
  return (["BMN", "ATK"] as const).filter((t) => canMutateInventory(actor.role, t));
}

export async function listOpnames(actor: AuthContext) {
  assertCanRead(actor);
  return [...opnames]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      mode: o.mode,
      locationName: locationById(o.locationId)?.name ?? null,
      createdByName: userName(o.createdById) ?? "—",
      startedAtLabel: formatDateTime(o.startedAt),
      total: o.items.length,
      counted: o.items.filter((i) => i.verificationStatus !== "NOT_VERIFIED").length,
      differences: o.items.filter((i) => i.verificationStatus === "MISMATCH" || i.verificationStatus === "NOT_FOUND").length,
    }));
}

export type OpnameListRow = Awaited<ReturnType<typeof listOpnames>>[number];

export async function getOpname(actor: AuthContext, id: string) {
  assertCanRead(actor);
  const opname = opnames.find((o) => o.id === id);
  if (!opname) return null;

  const allowed = new Set(mutableTypes(actor));
  const rows = [...opname.items]
    .sort((a, b) => itemById(a.itemId)!.code.localeCompare(itemById(b.itemId)!.code))
    .map((r) => {
      const item = itemById(r.itemId)!;
      return {
        id: r.id,
        itemId: item.id,
        code: item.code,
        name: item.name,
        type: item.type,
        unit: item.unit,
        editable: opname.status === "IN_PROGRESS" && allowed.has(item.type),
        systemQuantity: r.systemQuantity,
        systemQuantityLabel: formatQuantity(r.systemQuantity),
        actualQuantity: r.actualQuantity,
        actualQuantityLabel: formatQuantity(r.actualQuantity),
        discrepancyLabel: formatQuantity(r.discrepancy),
        discrepancy: r.discrepancy,
        systemLocationId: r.systemLocationId,
        systemLocationName: locationById(r.systemLocationId)?.name ?? null,
        actualLocationId: r.actualLocationId,
        actualLocationName: locationById(r.actualLocationId)?.name ?? null,
        systemCondition: r.systemCondition,
        actualCondition: r.actualCondition,
        verificationStatus: r.verificationStatus,
        notes: r.notes,
      };
    });

  return {
    id: opname.id,
    code: opname.code,
    status: opname.status,
    mode: opname.mode,
    bmnApplied: opname.bmnApplied,
    notes: opname.notes,
    locationName: locationById(opname.locationId)?.name ?? null,
    createdByName: userName(opname.createdById) ?? "—",
    startedAtLabel: formatDateTime(opname.startedAt),
    completedAtLabel: opname.completedAt ? formatDateTime(opname.completedAt) : null,
    canManage: opname.status === "IN_PROGRESS" && rows.some((r) => r.editable),
    rows,
    counted: rows.filter((r) => r.verificationStatus !== "NOT_VERIFIED").length,
    differences: rows.filter((r) => r.verificationStatus === "MISMATCH" || r.verificationStatus === "NOT_FOUND").length,
  };
}

export type OpnameDetail = NonNullable<Awaited<ReturnType<typeof getOpname>>>;
export type OpnameRow = OpnameDetail["rows"][number];

// Demo build: sessions are accepted and not stored. A new session opens the sample one in progress.
export async function createOpname(actor: AuthContext, _input: CreateOpnameInput, _ipAddress: string | null): Promise<OpnameResult<{ id: string }>> {
  if (mutableTypes(actor).length === 0) throw new AuthorizationError();
  const open = opnames.find((o) => o.status === "IN_PROGRESS") ?? opnames[0];
  return { ok: true, id: open.id };
}

export async function saveCounts(
  _actor: AuthContext,
  opnameId: string,
  form: Record<string, string>,
): Promise<OpnameResult<{ saved: number }>> {
  const opname = opnames.find((o) => o.id === opnameId);
  if (!opname) return { ok: false, error: "Sesi opname tidak ditemukan." };
  if (opname.status !== "IN_PROGRESS") return { ok: false, error: "Sesi ini sudah selesai atau dibatalkan." };
  return { ok: true, saved: opname.items.filter((r) => Object.keys(form).some((key) => key.includes(r.id))).length };
}

export async function completeOpname(
  actor: AuthContext,
  opnameId: string,
  _applyAdjustments: boolean,
  _applyBmn: boolean,
  _ipAddress: string | null,
): Promise<OpnameResult<{ adjusted: number; placed: number; conditionChanged: number; skipped: number; requested: number }>> {
  if (mutableTypes(actor).length === 0) throw new AuthorizationError();
  if (!opnames.some((o) => o.id === opnameId)) return { ok: false, error: "Sesi opname tidak ditemukan." };
  return { ok: true, adjusted: 0, placed: 0, conditionChanged: 0, skipped: 0, requested: 0 };
}

export async function cancelOpname(actor: AuthContext, opnameId: string, _ipAddress: string | null): Promise<OpnameResult> {
  if (mutableTypes(actor).length === 0) throw new AuthorizationError();
  if (!opnames.some((o) => o.id === opnameId)) return { ok: false, error: "Sesi opname tidak ditemukan." };
  return { ok: true };
}
