import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { approvals, userName } from "@/lib/mock/data";
import { canApproveRequests, canViewOperations } from "@/lib/permissions";
import { APPROVAL_STATUS_LABELS, type ApprovalKindName } from "@/lib/approvals/rules";
import { formatDateTime } from "@/lib/format";

export type ApprovalActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ApprovalActionResult => ({ ok: false, error });

export const APPROVAL_TABS = ["pending", "done"] as const;
export type ApprovalTab = (typeof APPROVAL_TABS)[number];

export function parseApprovalTab(value: string | string[] | undefined): ApprovalTab {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "done" ? "done" : "pending";
}

export interface ApprovalRow {
  id: string;
  kind: ApprovalKindName;
  status: keyof typeof APPROVAL_STATUS_LABELS;
  summary: string;
  requestedBy: string | null;
  decidedBy: string | null;
  createdAtLabel: string;
  decidedAtLabel: string | null;
  rejectedReason: string | null;
  mine: boolean;
  itemId: string | null;
  planId: string | null;
}

export interface ApprovalList {
  tab: ApprovalTab;
  rows: ApprovalRow[];
  counts: Record<ApprovalTab, number>;
  canApprove: boolean;
}

function assertCanView(actor: AuthContext) {
  if (!canViewOperations(actor.role)) throw new AuthorizationError();
}

export async function listApprovals(actor: AuthContext, tab: ApprovalTab): Promise<ApprovalList> {
  assertCanView(actor);
  const pending = approvals.filter((a) => a.status === "PENDING");
  const done = approvals.filter((a) => a.status !== "PENDING");
  const rows = tab === "pending" ? [...pending].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) : [...done].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return {
    tab,
    counts: { pending: pending.length, done: done.length },
    canApprove: canApproveRequests(actor.role),
    rows: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      summary: r.summary,
      requestedBy: userName(r.requestedById),
      decidedBy: userName(r.decidedById),
      createdAtLabel: formatDateTime(r.createdAt),
      decidedAtLabel: r.decidedAt ? formatDateTime(r.decidedAt) : null,
      rejectedReason: r.rejectedReason,
      mine: r.requestedById === actor.id,
      itemId: r.itemId,
      planId: r.planId,
    })),
  };
}

/** Waiting requests for the sidebar badge; only approvers are asked to act, so others see 0. */
export async function countPendingApprovals(actor: AuthContext): Promise<number> {
  if (!canViewOperations(actor.role) || !canApproveRequests(actor.role)) return 0;
  return approvals.filter((a) => a.status === "PENDING").length;
}

// Demo build: decisions are accepted and not stored.
export async function approveRequest(actor: AuthContext, _id: string, _ipAddress: string | null): Promise<ApprovalActionResult> {
  if (!canApproveRequests(actor.role)) return fail("Peran Anda tidak berwenang menyetujui permintaan.");
  return { ok: true };
}

export async function rejectRequest(actor: AuthContext, _id: string, _reason: string, _ipAddress: string | null): Promise<ApprovalActionResult> {
  if (!canApproveRequests(actor.role)) return fail("Peran Anda tidak berwenang menolak permintaan.");
  return { ok: true };
}

/** The requester (or an approver) withdraws a waiting request. */
export async function cancelRequest(_actor: AuthContext, _id: string, _ipAddress: string | null): Promise<ApprovalActionResult> {
  return { ok: true };
}
