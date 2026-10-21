import { picDisplayName } from "@/lib/employees/manual-pic-rules";
import type { AuthContext } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import { formatDate, formatDateTime, formatQuantity, formatRupiah, startOfDayInAppZone } from "@/lib/format";
import { displayCustomValue, type FieldType } from "@/lib/custom-fields/rules";
import { getListFields } from "@/lib/custom-fields/service";
import { categories, categoryById, employeeById, employees, items, locationById, locations, type ItemRec } from "@/lib/mock/data";
import { canReadInventory } from "@/lib/permissions";
import type { InventoryListQuery, InventorySortKey } from "@/validations/inventory";

/** An item with the related names the list and the export read, shaped like the real query result. */
export type ItemRecord = ItemRec & {
  category: { name: string } | null;
  location: { name: string } | null;
  pic: { name: string } | null;
};

export function joinItem(item: ItemRec): ItemRecord {
  const pic = employeeById(item.picId);
  const category = categoryById(item.categoryId);
  const location = locationById(item.locationId);
  return {
    ...item,
    category: category ? { name: category.name } : null,
    location: location ? { name: location.name } : null,
    pic: pic ? { name: pic.name } : null,
  };
}

const contains = (value: string | null | undefined, needle: string) => (value ?? "").toLowerCase().includes(needle.toLowerCase());

function matches(item: ItemRecord, query: InventoryListQuery): boolean {
  if (query.type && item.type !== query.type) return false;
  if (query.status && item.status !== query.status) return false;
  if (query.category && item.categoryId !== query.category) return false;
  if (query.location && item.locationId !== query.location) return false;
  if (query.pic && item.picId !== query.pic) return false;
  if (query.satker && item.kodeSatker !== query.satker) return false;
  if (query.condition && item.condition !== query.condition) return false;
  if (query.from && item.createdAt < startOfDayInAppZone(query.from)) return false;
  if (query.to && item.createdAt >= startOfDayInAppZone(query.to, 1)) return false;
  if (query.q) {
    // A bare number in the search box also matches the NUP.
    const nupQuery = /^\d{1,9}$/.test(query.q) ? Number(query.q) : null;
    const hit =
      contains(item.name, query.q) ||
      contains(item.code, query.q) ||
      contains(item.serialNumber, query.q) ||
      contains(item.brand, query.q) ||
      (item.kodeBarang ?? "").includes(query.q) ||
      contains(item.kodeRegister, query.q) ||
      (nupQuery !== null && item.nup === nupQuery) ||
      contains(item.pic?.name, query.q) ||
      contains(item.picName, query.q) ||
      contains(item.category?.name, query.q);
    if (!hit) return false;
  }
  return true;
}

/** Custom field filters of the filtered category: only filterable fields of that category count. */
async function matchesCustom(item: ItemRecord, query: InventoryListQuery): Promise<boolean> {
  const entries = Object.entries(query.cf ?? {});
  if (!query.category || entries.length === 0) return true;
  const defs = await getListFields(query.category);
  return defs.every((def) => {
    if (!def.filterable) return true;
    const raw = query.cf[def.id];
    if (raw === undefined) return true;
    const stored = item.customValues[def.id];
    return stored !== undefined && String(stored).toLowerCase() === raw.toLowerCase();
  });
}

function sortValue(item: ItemRecord, sort: InventorySortKey): string | number | Date | null {
  switch (sort) {
    case "category":
      return item.category?.name ?? null;
    case "location":
      return item.location?.name ?? null;
    case "pic":
      return item.pic?.name ?? null;
    default:
      return (item as unknown as Record<string, string | number | Date | null>)[sort] ?? null;
  }
}

function compare(a: string | number | Date, b: string | number | Date): number {
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b, "id", { sensitivity: "base" });
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return Number(a) - Number(b);
}

/** Filtered and ordered the way the real list is: nulls last, ties broken by code. */
export async function selectItems(query: InventoryListQuery): Promise<ItemRecord[]> {
  const base = items.map(joinItem).filter((item) => matches(item, query));
  const filtered: ItemRecord[] = [];
  for (const item of base) if (await matchesCustom(item, query)) filtered.push(item);
  const sign = query.dir === "desc" ? -1 : 1;
  return filtered.sort((a, b) => {
    const x = sortValue(a, query.sort);
    const y = sortValue(b, query.sort);
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    const primary = x === null || y === null ? 0 : sign * compare(x, y);
    if (primary !== 0) return primary;
    if (query.sort === "kodeBarang" && a.nup !== b.nup) return sign * ((a.nup ?? 0) - (b.nup ?? 0));
    return a.code.localeCompare(b.code) || a.id.localeCompare(b.id);
  });
}

/** Row sent to the client table. Display strings are formatted on the server (one time zone, one locale). */
function toRow(item: ItemRecord, columns: readonly { id: string; type: FieldType }[] = []) {
  const stored = item.customValues as Record<string, unknown>;
  const quantity = item.quantity;
  const minimumStock = item.minimumStock;
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    type: item.type,
    detail: item.model || null,
    brand: item.brand,
    kodeBarang: item.kodeBarang,
    nup: item.nup,
    satker: item.kodeSatker,
    nilaiPerolehanLabel: item.acquisitionPrice === null ? null : formatRupiah(item.acquisitionPrice),
    nilaiBukuLabel: item.nilaiBuku === null ? null : formatRupiah(item.nilaiBuku),
    statusPenggunaan: item.statusPenggunaan,
    serialNumber: item.serialNumber,
    categoryName: item.category?.name ?? null,
    locationName: item.location?.name ?? null,
    picName: picDisplayName(item.pic, item.picName),
    quantityLabel: formatQuantity(quantity),
    unit: item.unit,
    lowStock: item.type === "ATK" && item.status !== "DISPOSED" && (quantity === 0 || (minimumStock !== null && quantity <= minimumStock)),
    status: item.status,
    condition: item.condition,
    acquisitionDateLabel: item.acquisitionDate ? formatDate(item.acquisitionDate) : null,
    createdAtLabel: formatDateTime(item.createdAt),
    custom: Object.fromEntries(columns.map((c) => [c.id, displayCustomValue(c, stored[c.id])])),
  };
}

export type InventoryRow = ReturnType<typeof toRow>;

function assertCanRead(actor: AuthContext) {
  if (!canReadInventory(actor.role)) throw new AuthorizationError();
}

export async function listItems(actor: AuthContext, query: InventoryListQuery) {
  assertCanRead(actor);
  // Custom columns and filters of the filtered category.
  const fields = await getListFields(query.category);
  const columns = fields.filter((f) => f.showInList);

  const all = await selectItems(query);
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);

  return {
    rows: all.slice((page - 1) * query.pageSize, page * query.pageSize).map((i) => toRow(i, columns)),
    total,
    page,
    pageCount,
    pageSize: query.pageSize,
    customColumns: columns.map((c) => ({ id: c.id, label: c.label })),
    customFilters: fields.filter((f) => f.filterable),
  };
}

/** Options for the category / location / PIC filters. */
export async function getInventoryFilterOptions(actor: AuthContext) {
  assertCanRead(actor);
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "id");
  return {
    categories: [...categories]
      .sort((a, b) => a.type.localeCompare(b.type) || byName(a, b))
      .map((c) => ({ id: c.id, name: `${c.name} (${c.type})` })),
    locations: [...locations].sort(byName).map((l) => ({ id: l.id, name: l.name })),
    pics: [...employees].sort(byName).map((e) => ({ id: e.id, name: e.name })),
    satkers: [...new Set(items.flatMap((i) => (i.kodeSatker ? [i.kodeSatker] : [])))].sort(),
  };
}

export type InventoryFilterOptions = Awaited<ReturnType<typeof getInventoryFilterOptions>>;

export const EXPORT_MAX_ROWS = 10_000;

/**
 * Items for export: the filtered list (all pages), or only `ids` within it.
 * Returns null when the result is larger than EXPORT_MAX_ROWS.
 */
export async function listItemsForExport(actor: AuthContext, query: InventoryListQuery, ids?: string[]) {
  assertCanRead(actor);
  const all = (await selectItems(query)).filter((i) => !ids || ids.includes(i.id));
  return all.length > EXPORT_MAX_ROWS ? null : all;
}

export type ExportItem = ItemRecord;
