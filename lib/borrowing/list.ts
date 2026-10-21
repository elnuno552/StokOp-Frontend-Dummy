import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { borrowerLabel, daysUntilDue, reminderKind, type ReminderKind } from "@/lib/borrowing/rules";
import { borrowings, employeeById, itemById, userName, type BorrowingRec } from "@/lib/mock/data";
import { canApproveBorrowing, canViewOperations } from "@/lib/permissions";
import { getAppSettings } from "@/lib/settings/service";

export const BORROWING_TABS = ["pending", "active", "overdue", "done"] as const;
export type BorrowingTab = (typeof BORROWING_TABS)[number];

export const BORROWING_TAB_LABELS: Record<BorrowingTab, string> = {
  pending: "Menunggu persetujuan",
  active: "Aktif",
  overdue: "Terlambat",
  done: "Selesai",
};

export function parseBorrowingTab(value: string | string[] | undefined): BorrowingTab {
  const v = Array.isArray(value) ? value[0] : value;
  return (BORROWING_TABS as readonly string[]).includes(v ?? "") ? (v as BorrowingTab) : "active";
}

// An active loan is overdue once past its due moment, whether or not a job flipped the status to OVERDUE.
function inTab(b: BorrowingRec, tab: BorrowingTab, now: Date): boolean {
  switch (tab) {
    case "pending":
      return b.status === "PENDING";
    case "overdue":
      return b.status === "OVERDUE" || (b.status === "BORROWED" && b.expectedReturnAt !== null && b.expectedReturnAt < now);
    case "active":
      return b.status === "BORROWED" || b.status === "OVERDUE";
    case "done":
      return b.status === "RETURNED" || b.status === "REJECTED" || b.status === "CANCELLED";
  }
}

export interface BorrowingRow {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  status: "PENDING" | "BORROWED" | "OVERDUE" | "RETURNED" | "REJECTED" | "CANCELLED";
  borrowerType: "EMPLOYEE" | "EXTERNAL";
  borrower: string;
  basisDocument: string | null;
  usageType: string | null;
  notes: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  rejectedReason: string | null;
  createdAt: Date;
  borrowedAt: Date;
  expectedReturnAt: Date | null;
  returnedAt: Date | null;
  reminder: ReminderKind;
  daysUntilDue: number | null;
  /** The viewer filed this request, so they may withdraw it. */
  mine: boolean;
}

export interface BorrowingList {
  tab: BorrowingTab;
  rows: BorrowingRow[];
  counts: Record<BorrowingTab, number>;
  canApprove: boolean;
  reminderDays: number;
}

export async function listBorrowings(actor: AuthContext, tab: BorrowingTab): Promise<BorrowingList> {
  if (!canViewOperations(actor.role)) throw new AuthorizationError();
  const now = new Date();
  const settings = await getAppSettings();
  const count = (t: BorrowingTab) => borrowings.filter((b) => inTab(b, t, now)).length;

  const rows = borrowings.filter((b) => inTab(b, tab, now));
  if (tab === "done") rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  else if (tab === "pending") rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  else rows.sort((a, b) => (a.expectedReturnAt?.getTime() ?? Infinity) - (b.expectedReturnAt?.getTime() ?? Infinity) || a.borrowedAt.getTime() - b.borrowedAt.getTime());

  return {
    tab,
    counts: { pending: count("pending"), active: count("active"), overdue: count("overdue"), done: count("done") },
    canApprove: canApproveBorrowing(actor.role),
    reminderDays: settings.reminderDays,
    rows: rows.map((b) => {
      const open = b.status === "BORROWED" || b.status === "OVERDUE";
      const item = itemById(b.itemId)!;
      return {
        id: b.id,
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        status: b.status,
        borrowerType: b.borrowerType,
        borrower: borrowerLabel({ borrowerType: b.borrowerType, borrowerName: employeeById(b.borrowerId)?.name, externalParty: b.externalParty }),
        basisDocument: b.basisDocument,
        usageType: b.usageType,
        notes: b.notes,
        requestedBy: userName(b.requestedById),
        approvedBy: userName(b.approvedById),
        rejectedReason: b.rejectedReason,
        createdAt: b.createdAt,
        borrowedAt: b.borrowedAt,
        expectedReturnAt: b.expectedReturnAt,
        returnedAt: b.returnedAt,
        reminder: open ? reminderKind(b.expectedReturnAt, now, settings.reminderDays) : "NONE",
        daysUntilDue: open ? daysUntilDue(b.expectedReturnAt, now) : null,
        mine: b.requestedById === actor.id,
      };
    }),
  };
}

/** Count for the sidebar badge: what needs attention now (waiting requests for approvers, plus overdue loans). */
export async function getBorrowingBadge(actor: AuthContext): Promise<number> {
  if (!canViewOperations(actor.role)) return 0;
  const now = new Date();
  const overdue = borrowings.filter((b) => inTab(b, "overdue", now)).length;
  const pending = canApproveBorrowing(actor.role) ? borrowings.filter((b) => inTab(b, "pending", now)).length : 0;
  return overdue + pending;
}
