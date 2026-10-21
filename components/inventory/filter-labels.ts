import type { ItemCondition, ItemStatus } from "@/lib/generated/prisma/enums";
import type { InventoryFilterOptions } from "@/lib/inventory/list";
import { ITEM_CONDITION_LABELS, ITEM_STATUS_LABELS } from "@/lib/inventory/labels";
import type { InventoryFilterKey, InventoryListQuery } from "@/validations/inventory";

export const FILTER_LABELS: Record<InventoryFilterKey, string> = {
  type: "Tipe",
  status: "Status",
  category: "Kategori",
  location: "Lokasi",
  pic: "PIC",
  satker: "Satker",
  condition: "Kondisi",
  from: "Ditambahkan dari",
  to: "Ditambahkan sampai",
};

/** Status choices grouped by the item type they apply to. */
export const STATUS_GROUPS: { label: string; statuses: ItemStatus[] }[] = [
  { label: "BMN", statuses: ["AVAILABLE", "IN_USE", "BORROWED", "UNDER_MAINTENANCE", "LOST"] },
  { label: "ATK", statuses: ["IN_STOCK", "OUT_OF_STOCK"] },
  { label: "BMN dan ATK", statuses: ["DISPOSED"] },
];

/** YYYY-MM-DD → DD/MM/YYYY without time zone or locale data (same on server and client). */
export function formatDateParam(value: string): string {
  return value.split("-").reverse().join("/");
}

export function filterValueLabel(
  key: InventoryFilterKey,
  query: InventoryListQuery,
  options: InventoryFilterOptions,
): string | null {
  const value = query[key];
  if (!value) return null;
  switch (key) {
    case "status":
      return ITEM_STATUS_LABELS[value as ItemStatus];
    case "condition":
      return ITEM_CONDITION_LABELS[value as ItemCondition];
    case "category":
      return options.categories.find((o) => o.id === value)?.name ?? "Tidak ditemukan";
    case "location":
      return options.locations.find((o) => o.id === value)?.name ?? "Tidak ditemukan";
    case "pic":
      return options.pics.find((o) => o.id === value)?.name ?? "Tidak ditemukan";
    case "from":
    case "to":
      return formatDateParam(value);
    default:
      return value;
  }
}
