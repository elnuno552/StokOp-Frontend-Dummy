import type { AuthContext } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import type { ItemStatus, TransactionType } from "@/lib/generated/prisma/enums";
import { topWithOther } from "@/lib/dashboard/chart";
import { ITEM_CONDITION_LABELS } from "@/lib/inventory/labels";
import { BMN_STATUSES } from "@/lib/inventory/rules";
import { borrowerLabel } from "@/lib/borrowing/rules";
import { borrowings, categories, disposals, employeeById, itemById, items, locationById, maintenance, opnames, approvals, transactions, userName } from "@/lib/mock/data";
import { canApproveBorrowing, canApproveRequests, canReadInventory } from "@/lib/permissions";
import { getAppSettings } from "@/lib/settings/service";

const OVERDUE_LIMIT = 5;
const RECENT_TRANSACTION_LIMIT = 8;
const CATEGORY_CHART_LIMIT = 6;

export interface DashboardTransaction {
  id: string;
  type: TransactionType;
  createdAt: Date;
  item: { code: string; name: string; type: "BMN" | "ATK"; unit: string | null };
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  fromLocation: string | null;
  toLocation: string | null;
  fromPic: string | null;
  toPic: string | null;
  performedBy: string;
}

export async function getDashboardSummary(actor: AuthContext) {
  if (!canReadInventory(actor.role)) throw new AuthorizationError();

  const now = new Date();
  const settings = await getAppSettings();
  const dueSoonUntil = new Date(now.getTime() + settings.reminderDays * 24 * 60 * 60 * 1000);
  const approver = canApproveBorrowing(actor.role);

  const count = (type: "BMN" | "ATK", status: ItemStatus) => items.filter((i) => i.type === type && i.status === status).length;
  const bmnByStatus = BMN_STATUSES.map((status) => ({ status, count: count("BMN", status) }));
  const heldBmn = items.filter((i) => i.type === "BMN" && i.status !== "LOST" && i.status !== "DISPOSED");

  const lowStock = items
    .filter((i) => i.type === "ATK" && i.status !== "DISPOSED" && (i.quantity === 0 || (i.minimumStock !== null && i.quantity <= i.minimumStock)))
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));

  const borrowerOf = (b: (typeof borrowings)[number]) =>
    borrowerLabel({ borrowerType: b.borrowerType, borrowerName: employeeById(b.borrowerId)?.name, externalParty: b.externalParty });
  const view = (b: (typeof borrowings)[number]) => ({
    id: b.id,
    itemId: b.itemId,
    itemCode: itemById(b.itemId)!.code,
    itemName: itemById(b.itemId)!.name,
    borrower: borrowerOf(b),
    expectedReturnAt: b.expectedReturnAt,
  });
  const isOverdue = (b: (typeof borrowings)[number]) => b.status === "OVERDUE" || (b.status === "BORROWED" && b.expectedReturnAt !== null && b.expectedReturnAt < now);
  const overdue = borrowings.filter(isOverdue).sort((a, b) => a.expectedReturnAt!.getTime() - b.expectedReturnAt!.getTime());
  const dueSoon = borrowings
    .filter((b) => b.status === "BORROWED" && b.expectedReturnAt !== null && b.expectedReturnAt >= now && b.expectedReturnAt <= dueSoonUntil)
    .sort((a, b) => a.expectedReturnAt!.getTime() - b.expectedReturnAt!.getTime());

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = new Map<string, number>();
  for (const i of heldBmn) {
    const label = i.categoryId ? (categoryName.get(i.categoryId) ?? "Tanpa kategori") : "Tanpa kategori";
    byCategory.set(label, (byCategory.get(label) ?? 0) + 1);
  }

  const bmn = items.filter((i) => i.type === "BMN");
  const acquired = bmn.filter((i) => i.acquisitionPrice !== null);
  const booked = bmn.filter((i) => i.nilaiBuku !== null);

  return {
    totalItems: items.length,
    bmn: {
      active: bmnByStatus.filter((row) => row.status !== "LOST" && row.status !== "DISPOSED").reduce((sum, row) => sum + row.count, 0),
      borrowed: count("BMN", "BORROWED"),
      underMaintenance: count("BMN", "UNDER_MAINTENANCE"),
      byStatus: bmnByStatus,
    },
    atk: {
      active: count("ATK", "IN_STOCK") + count("ATK", "OUT_OF_STOCK"),
      outOfStock: count("ATK", "OUT_OF_STOCK"),
      lowStock: {
        enabled: settings.lowStockEnabled,
        total: settings.lowStockEnabled ? lowStock.length : 0,
        rows: settings.lowStockEnabled
          ? lowStock.slice(0, settings.lowStockLimit).map((i) => ({ id: i.id, code: i.code, name: i.name, unit: i.unit, quantity: i.quantity, minimumStock: i.minimumStock }))
          : [],
      },
    },
    borrowings: {
      active: borrowings.filter((b) => b.status === "BORROWED" || b.status === "OVERDUE").length,
      overdue: { total: overdue.length, rows: overdue.slice(0, OVERDUE_LIMIT).map(view) },
    },
    bmnByCategory: topWithOther([...byCategory].map(([label, n]) => ({ label, count: n })), CATEGORY_CHART_LIMIT),
    bmnByCondition: (Object.keys(ITEM_CONDITION_LABELS) as (keyof typeof ITEM_CONDITION_LABELS)[]).map((condition) => ({
      condition,
      count: heldBmn.filter((i) => i.condition === condition).length,
    })),
    openMaintenance: maintenance.filter((m) => m.status === "REPORTED" || m.status === "IN_PROGRESS").length,
    openOpnames: opnames.filter((o) => o.status === "DRAFT" || o.status === "IN_PROGRESS").length,
    openDisposals: disposals.filter((d) => d.status === "PROPOSED" || d.status === "APPROVED").length,
    approvalsPending: canApproveRequests(actor.role) ? approvals.filter((a) => a.status === "PENDING").length : 0,
    reminders: {
      days: settings.reminderDays,
      pendingApproval: approver ? borrowings.filter((b) => b.status === "PENDING").length : 0,
      dueSoon: { total: dueSoon.length, rows: dueSoon.slice(0, OVERDUE_LIMIT).map(view) },
    },
    bmnValue: {
      acquisition: acquired.length > 0 ? acquired.reduce((sum, i) => sum + (i.acquisitionPrice ?? 0), 0) : null,
      book: booked.length > 0 ? booked.reduce((sum, i) => sum + (i.nilaiBuku ?? 0), 0) : null,
    },
    recentTransactions: transactions.slice(0, RECENT_TRANSACTION_LIMIT).map((t): DashboardTransaction => {
      const item = itemById(t.itemId)!;
      return {
        id: t.id,
        type: t.type,
        createdAt: t.createdAt,
        item: { code: item.code, name: item.name, type: item.type, unit: item.unit },
        quantity: t.quantity,
        quantityBefore: t.quantityBefore,
        quantityAfter: t.quantityAfter,
        fromLocation: locationById(t.fromLocationId)?.name ?? null,
        toLocation: locationById(t.toLocationId)?.name ?? null,
        fromPic: employeeById(t.fromPicId)?.name ?? null,
        toPic: employeeById(t.toPicId)?.name ?? null,
        performedBy: userName(t.performedById) ?? "—",
      };
    }),
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
