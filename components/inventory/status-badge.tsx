import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";
import { ITEM_STATUS_LABELS } from "@/lib/inventory/labels";

// Color reinforces the label; the text always states the status (DESIGN.md §21).
const STATUS_TONE: Record<ItemStatus, BadgeTone> = {
  AVAILABLE: "success",
  IN_STOCK: "success",
  IN_USE: "info",
  BORROWED: "warning",
  UNDER_MAINTENANCE: "warning",
  LOST: "danger",
  OUT_OF_STOCK: "danger",
  DISPOSED: "neutral",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ITEM_STATUS_LABELS[status]}</Badge>;
}

/** BMN / ATK marker: a plain label, not a status. */
export function TypeBadge({ type }: { type: ItemType }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded border border-border-strong px-1.5 py-0.5 font-mono text-xs font-medium text-fg-secondary">
      {type}
    </span>
  );
}
