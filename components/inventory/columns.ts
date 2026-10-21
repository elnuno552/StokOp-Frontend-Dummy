// Column definitions for the inventory table. Client-safe: the server page reads
// the saved column choice from a cookie so the first render already matches.
import type { InventorySortKey } from "@/validations/inventory";

export const INVENTORY_COLUMNS_COOKIE = "inventory_columns";

export type ColumnFilterKind = "type" | "status" | "category" | "location" | "pic" | "satker" | "condition" | "createdAt";

export interface InventoryColumn {
  key: string;
  label: string;
  sort?: InventorySortKey;
  filter?: ColumnFilterKind;
  /** Always shown; cannot be hidden in the column menu. */
  required?: boolean;
  defaultVisible: boolean;
  align?: "right";
}

export const INVENTORY_COLUMNS = [
  { key: "code", label: "Kode", sort: "code", required: true, defaultVisible: true },
  { key: "kodeBarang", label: "Kode barang", sort: "kodeBarang", defaultVisible: true },
  { key: "nup", label: "NUP", defaultVisible: true, align: "right" },
  { key: "name", label: "Nama barang", sort: "name", required: true, defaultVisible: true },
  { key: "brand", label: "Merk", sort: "brand", defaultVisible: true },
  { key: "type", label: "Tipe", sort: "type", filter: "type", defaultVisible: true },
  { key: "category", label: "Kategori", sort: "category", filter: "category", defaultVisible: true },
  { key: "location", label: "Lokasi", sort: "location", filter: "location", defaultVisible: true },
  { key: "pic", label: "PIC", sort: "pic", filter: "pic", defaultVisible: true },
  { key: "quantity", label: "Jumlah", sort: "quantity", defaultVisible: true, align: "right" },
  { key: "status", label: "Status", sort: "status", filter: "status", defaultVisible: true },
  { key: "condition", label: "Kondisi", sort: "condition", filter: "condition", defaultVisible: false },
  { key: "satker", label: "Satker", filter: "satker", defaultVisible: false },
  { key: "nilaiPerolehan", label: "Nilai perolehan", sort: "acquisitionPrice", defaultVisible: false, align: "right" },
  { key: "nilaiBuku", label: "Nilai buku", sort: "nilaiBuku", defaultVisible: false, align: "right" },
  { key: "statusPenggunaan", label: "Status penggunaan", defaultVisible: false },
  { key: "serialNumber", label: "No. seri", defaultVisible: false },
  { key: "acquisitionDate", label: "Tgl. perolehan", sort: "acquisitionDate", defaultVisible: false },
  { key: "createdAt", label: "Ditambahkan", sort: "createdAt", filter: "createdAt", defaultVisible: false },
] as const satisfies readonly InventoryColumn[];

export type InventoryColumnKey = (typeof INVENTORY_COLUMNS)[number]["key"];

export const DEFAULT_VISIBLE_COLUMNS: InventoryColumnKey[] = INVENTORY_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);

/** Saved column choice (comma-separated keys) → visible keys, falling back to the defaults. */
export function parseVisibleColumns(value: string | undefined): InventoryColumnKey[] {
  if (!value) return DEFAULT_VISIBLE_COLUMNS;
  const wanted = new Set(value.split(","));
  const visible = INVENTORY_COLUMNS.filter((c) => ("required" in c && c.required) || wanted.has(c.key)).map((c) => c.key);
  return visible.length > 2 ? visible : DEFAULT_VISIBLE_COLUMNS;
}

export function saveVisibleColumns(keys: InventoryColumnKey[]) {
  document.cookie = `${INVENTORY_COLUMNS_COOKIE}=${keys.join(",")}; path=/; max-age=31536000; samesite=lax`;
}
