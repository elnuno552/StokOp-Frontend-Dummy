// Disposal (penghapusan) rules without I/O, shared by the service, the pages and the tests.

export const DISPOSAL_STATUSES = ["PROPOSED", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"] as const;
export type DisposalStatusName = (typeof DISPOSAL_STATUSES)[number];

export const DISPOSAL_REASONS = ["LOST", "DAMAGED", "OBSOLETE", "OTHER"] as const;
export type DisposalReasonName = (typeof DISPOSAL_REASONS)[number];

export const DISPOSAL_STATUS_LABELS: Record<DisposalStatusName, string> = {
  PROPOSED: "Diusulkan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  COMPLETED: "Dihapuskan",
  CANCELLED: "Dibatalkan",
};

export const DISPOSAL_REASON_LABELS: Record<DisposalReasonName, string> = {
  LOST: "Hilang",
  DAMAGED: "Rusak berat",
  OBSOLETE: "Tidak digunakan / usang",
  OTHER: "Lainnya",
};

export type DisposalAction = "approve" | "reject" | "complete" | "cancel";

const TRANSITIONS: Record<DisposalStatusName, Partial<Record<DisposalAction, DisposalStatusName>>> = {
  PROPOSED: { approve: "APPROVED", reject: "REJECTED", cancel: "CANCELLED" },
  APPROVED: { complete: "COMPLETED", cancel: "CANCELLED" },
  REJECTED: {},
  COMPLETED: {},
  CANCELLED: {},
};

/** The status after `action`, or null when that step is not allowed from `current`. */
export function nextDisposalStatus(current: DisposalStatusName, action: DisposalAction): DisposalStatusName | null {
  return TRANSITIONS[current][action] ?? null;
}

/** A proposal that is still in progress (blocks a second one and blocks lending the asset). */
export function isOpenDisposal(status: DisposalStatusName): boolean {
  return status === "PROPOSED" || status === "APPROVED";
}

/** Item statuses an asset may have to be marked lost or disposed: it must not be out on loan or in repair. */
export const DISPOSABLE_ITEM_STATUSES = ["AVAILABLE", "IN_USE", "LOST"] as const;

export function canMarkLost(itemStatus: string): boolean {
  return itemStatus === "AVAILABLE" || itemStatus === "IN_USE";
}

export function canDispose(itemStatus: string): boolean {
  return (DISPOSABLE_ITEM_STATUSES as readonly string[]).includes(itemStatus);
}
