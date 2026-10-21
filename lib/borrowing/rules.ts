// Borrowing rules without I/O, shared by the service, the pages and the tests.
import { canApproveBorrowing } from "@/lib/permissions";
import type { RoleName } from "@/lib/permissions";

/** What a new borrowing record starts as: approvers lend directly, other admins send a request. */
export function decideBorrowStart(role: RoleName): "BORROWED" | "PENDING" {
  return canApproveBorrowing(role) ? "BORROWED" : "PENDING";
}

/** Shown on the asset while an external party uses it, unless the admin writes their own wording. */
export const DEFAULT_EXTERNAL_USAGE = "Digunakan sementara oleh pihak lain";

export type ReminderKind = "OVERDUE" | "DUE_SOON" | "NONE";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from now until the due date (negative once overdue), or null without a due date. */
export function daysUntilDue(expectedReturnAt: Date | null, now: Date): number | null {
  if (!expectedReturnAt) return null;
  return Math.ceil((expectedReturnAt.getTime() - now.getTime()) / DAY_MS);
}

/** Active loans only: OVERDUE after the due moment, DUE_SOON within `reminderDays`, otherwise NONE. */
export function reminderKind(expectedReturnAt: Date | null, now: Date, reminderDays: number): ReminderKind {
  if (!expectedReturnAt) return "NONE";
  if (expectedReturnAt.getTime() < now.getTime()) return "OVERDUE";
  const days = daysUntilDue(expectedReturnAt, now);
  return days !== null && days <= reminderDays ? "DUE_SOON" : "NONE";
}

/** Who borrowed: the employee's name, or the external party with its basis document. */
export function borrowerLabel(b: { borrowerType: "EMPLOYEE" | "EXTERNAL"; borrowerName?: string | null; externalParty?: string | null }): string {
  if (b.borrowerType === "EXTERNAL") return b.externalParty ? `${b.externalParty} (pihak lain)` : "Pihak lain";
  return b.borrowerName ?? "—";
}
