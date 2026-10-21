// Approval rules without I/O. Which actions need approval is a setting (approvals.required); who may approve is the
// approve_requests capability of a role. Borrowing has its own approve_borrowing flow.
import { canApproveRequests, type RoleName } from "@/lib/permissions";

export const APPROVAL_KINDS = ["DISPOSAL_DECISION", "STOCK_ADJUSTMENT", "PLAN_RECEIPT", "BMN_TRANSFER"] as const;
export type ApprovalKindName = (typeof APPROVAL_KINDS)[number];

export const APPROVAL_KIND_INFO: Record<ApprovalKindName, { label: string; hint: string }> = {
  DISPOSAL_DECISION: { label: "Keputusan usulan penghapusan aset", hint: "Persetujuan atau penolakan usulan penghapusan menunggu penyetuju." },
  STOCK_ADJUSTMENT: { label: "Penyesuaian stok ATK", hint: "Termasuk penyesuaian dari hasil stock opname. Stok berubah setelah disetujui." },
  PLAN_RECEIPT: { label: "Penerimaan barang RAB", hint: "Stok bertambah setelah penerimaan disetujui." },
  BMN_TRANSFER: { label: "Pemindahan lokasi / serah terima BMN", hint: "Termasuk penempatan dari pendataan lokasi di stock opname." },
};

export const APPROVAL_STATUS_LABELS = { PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak", CANCELLED: "Dibatalkan" } as const;

export function isApprovalKind(value: unknown): value is ApprovalKindName {
  return typeof value === "string" && (APPROVAL_KINDS as readonly string[]).includes(value);
}

/** Known kinds only, once each, in canonical order. */
export function normalizeApprovalKinds(value: unknown): ApprovalKindName[] {
  const list = Array.isArray(value) ? value : [];
  return APPROVAL_KINDS.filter((k) => list.includes(k));
}

/** True when this action must wait for approval: it is required, and the actor cannot approve it themselves. */
export function approvalGate(kind: ApprovalKindName, required: readonly string[], role: RoleName): boolean {
  return required.includes(kind) && !canApproveRequests(role);
}
