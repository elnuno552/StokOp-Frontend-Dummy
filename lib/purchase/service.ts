import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { itemById, items, plans, userName } from "@/lib/mock/data";
import { DEMO_NOTICE } from "@/lib/mock/helpers";
import { approvalRequired } from "@/lib/approvals/store";
import { canMutateInventory, canViewOperations } from "@/lib/permissions";
import { factorToPercent, planTotals } from "@/lib/purchase/calc";
import { remainingQuantity } from "@/lib/purchase/receipts";
import type { PlanHeaderInput, PlanLineInput } from "@/validations/purchase";

export type PlanResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

/** Purchase plans are for ATK, so the ATK admin and Super Admin manage them; everyone can read. */
export function canManagePlans(actor: AuthContext): boolean {
  return canMutateInventory(actor.role, "ATK");
}

function assertCanRead(actor: AuthContext) {
  if (!canViewOperations(actor.role)) throw new AuthorizationError();
}

function assertCanManage(actor: AuthContext) {
  if (!canManagePlans(actor)) throw new AuthorizationError();
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export async function listPlans(actor: AuthContext) {
  assertCanRead(actor);
  return [...plans]
    .sort((a, b) => b.planDate.getTime() - a.planDate.getTime())
    .map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      planDateLabel: formatDate(p.planDate),
      status: p.status,
      lineCount: p.lines.length,
      total: planTotals(
        p.lines.map((l) => ({ volume: l.volume, unitPrice: l.unitPrice, shippingCost: l.shippingCost })),
        p.priceFactor,
        p.ppnRate,
      ).total,
      createdByName: userName(p.createdById) ?? "—",
    }));
}

export type PlanListRow = Awaited<ReturnType<typeof listPlans>>[number];

export async function getPlan(actor: AuthContext, id: string) {
  assertCanRead(actor);
  const plan = plans.find((p) => p.id === id);
  if (!plan) return null;

  const lines = [...plan.lines]
    .sort((a, b) => a.lineNo - b.lineNo)
    .map((l) => {
      const item = l.itemId ? itemById(l.itemId) : undefined;
      return {
        id: l.id,
        lineNo: l.lineNo,
        itemId: l.itemId,
        itemLabel: item ? `${item.code} · ${item.name}` : null,
        itemUnit: item?.unit ?? null,
        description: l.description,
        volume: l.volume,
        unit: l.unit,
        unitPrice: l.unitPrice,
        shippingCost: l.shippingCost,
        link: l.link,
        hasImage: l.hasImage,
        receivedQuantity: l.receivedQuantity,
        remaining: remainingQuantity(l.volume, l.receivedQuantity),
      };
    });

  return {
    id: plan.id,
    code: plan.code,
    title: plan.title,
    planDate: isoDate(plan.planDate),
    planDateLabel: formatDate(plan.planDate),
    priceFactor: plan.priceFactor,
    pricePercent: factorToPercent(plan.priceFactor),
    ppnRate: plan.ppnRate,
    rounding: plan.rounding,
    status: plan.status,
    notes: plan.notes,
    createdByName: userName(plan.createdById) ?? "—",
    canManage: canManagePlans(actor),
    lines,
    receipts: [...plan.receipts]
      .sort((a, b) => a.receiptNo - b.receiptNo)
      .map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        receivedAtLabel: formatDate(r.receivedAt),
        notes: r.notes,
        createdByName: userName(r.createdById),
        lines: r.lines.map((rl) => {
          const line = plan.lines.find((l) => l.lineNo === rl.lineNo)!;
          return { id: rl.id, lineNo: rl.lineNo, description: line.description, unit: line.unit, quantity: rl.quantity };
        }),
      })),
    totals: planTotals(lines, plan.priceFactor, plan.ppnRate),
  };
}

export type PlanDetail = NonNullable<Awaited<ReturnType<typeof getPlan>>>;
export type PlanLineView = PlanDetail["lines"][number];

/** ATK items the lines can point at, for the "barang" picker. */
export async function listAtkOptions(actor: AuthContext) {
  assertCanRead(actor);
  return items
    .filter((i) => i.type === "ATK" && i.status !== "DISPOSED")
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((i) => ({ id: i.id, label: `${i.name} (${i.code})`, name: i.name, unit: i.unit ?? "" }));
}

export interface NewPlanLine extends Omit<PlanLineInput, "id" | "itemId"> {
  itemId?: string;
  image?: { bytes: Uint8Array; mimeType: string; extension: string };
}

// Demo build: access and the basic status rules are kept; nothing is stored.
function draftOrError(actor: AuthContext, id: string): { ok: false; error: string } | null {
  assertCanManage(actor);
  const plan = plans.find((p) => p.id === id);
  if (!plan) return { ok: false, error: "Rencana pembelian tidak ditemukan." };
  if (plan.status !== "DRAFT") return { ok: false, error: "Hanya rencana berstatus Draf yang dapat diubah." };
  return null;
}

export async function createPlan(
  actor: AuthContext,
  _header: PlanHeaderInput,
  _lines: NewPlanLine[],
  _ipAddress: string | null,
): Promise<PlanResult<{ id: string; code: string }>> {
  assertCanManage(actor);
  // Land on the sample draft so the redirect after saving shows a real plan.
  const draft = plans.find((p) => p.status === "DRAFT") ?? plans[0];
  return { ok: true, id: draft.id, code: draft.code };
}

export async function updateHeader(actor: AuthContext, id: string, _header: PlanHeaderInput, _ipAddress: string | null): Promise<PlanResult> {
  return draftOrError(actor, id) ?? { ok: true };
}

export async function saveLines(actor: AuthContext, id: string, lines: PlanLineInput[], _ipAddress: string | null): Promise<PlanResult<{ count: number }>> {
  return draftOrError(actor, id) ?? { ok: true, count: lines.length };
}

export async function suggestLowStock(actor: AuthContext, id: string) {
  assertCanRead(actor);
  const taken = new Set((plans.find((p) => p.id === id)?.lines ?? []).flatMap((l) => (l.itemId ? [l.itemId] : [])));
  return items
    .filter((i) => i.type === "ATK" && i.status !== "DISPOSED" && !taken.has(i.id))
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .flatMap((i) => {
      const quantity = i.quantity;
      const minimum = i.minimumStock;
      if (!(quantity === 0 || (minimum !== null && quantity <= minimum))) return [];
      // Order enough to reach twice the minimum (at least 1).
      const volume = Math.max(1, Math.ceil((minimum ?? 0) * 2 - quantity));
      return [{ itemId: i.id, description: i.name, unit: i.unit ?? "", volume: String(volume), stock: quantity, minimum }];
    });
}

type Transition = "FINALIZE" | "REOPEN" | "CANCEL";

export async function changeStatus(actor: AuthContext, id: string, _transition: Transition, _ipAddress: string | null): Promise<PlanResult> {
  assertCanManage(actor);
  if (!plans.some((p) => p.id === id)) return { ok: false, error: "Rencana pembelian tidak ditemukan." };
  return { ok: true };
}

export async function receivePlan(
  actor: AuthContext,
  id: string,
  input: { quantities: Record<string, number>; receivedAt?: string; notes?: string },
  _ipAddress: string | null,
): Promise<PlanResult<{ booked: number; complete: boolean; pending?: boolean }>> {
  assertCanManage(actor);
  const plan = plans.find((p) => p.id === id);
  if (!plan) return { ok: false, error: "Rencana pembelian tidak ditemukan." };
  const booked = Object.values(input.quantities).filter((q) => q > 0).length;
  if (await approvalRequired(actor, "PLAN_RECEIPT")) return { ok: true, booked: 0, complete: false, pending: true };
  return { ok: true, booked, complete: plan.lines.every((l) => remainingQuantity(l.volume, l.receivedQuantity) <= (input.quantities[l.id] ?? 0)) };
}

export async function closePlan(actor: AuthContext, id: string, _ipAddress: string | null): Promise<PlanResult> {
  assertCanManage(actor);
  if (!plans.some((p) => p.id === id)) return { ok: false, error: "Rencana pembelian tidak ditemukan." };
  return { ok: true };
}

export async function createItemsFromLines(actor: AuthContext, id: string, _ipAddress: string | null): Promise<PlanResult<{ created: number; linked: number }>> {
  assertCanManage(actor);
  const plan = plans.find((p) => p.id === id);
  if (!plan) return { ok: false, error: "Rencana pembelian tidak ditemukan." };
  const linked = plan.lines.filter((l) => l.itemId).length;
  return { ok: true, created: plan.lines.length - linked, linked };
}

export { DEMO_NOTICE };
