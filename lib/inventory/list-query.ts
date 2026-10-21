// URL building for the inventory list. Pure and client-safe: the server page
// and the client table use the same function, so links and navigation agree.
import type { InventoryFilterKey, InventoryListQuery } from "@/validations/inventory";

export const INVENTORY_PATH = "/inventory";

export type InventoryPatch = Partial<{ [K in keyof InventoryListQuery]: InventoryListQuery[K] | undefined }>;
type Patch = InventoryPatch;

/** Search params for `query` with `patch` applied. Any change other than `page` resets to page 1. */
export function inventoryParams(query: InventoryListQuery, patch: Patch = {}): URLSearchParams {
  const next = { ...query, ...patch };
  if (!("page" in patch)) next.page = 1;

  const params = new URLSearchParams();
  for (const key of ["q", "type", "status", "category", "location", "pic", "satker", "condition", "from", "to"] as const) {
    const value = next[key];
    if (value) params.set(key, value);
  }
  for (const [id, value] of Object.entries(next.cf ?? {})) {
    if (value) params.set(`cf.${id}`, value);
  }
  if (next.sort !== "code" || next.dir !== "asc") {
    params.set("sort", next.sort);
    params.set("dir", next.dir);
  }
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}

export function inventoryHref(query: InventoryListQuery, patch: Patch = {}): string {
  const qs = inventoryParams(query, patch).toString();
  return qs ? `${INVENTORY_PATH}?${qs}` : INVENTORY_PATH;
}

export function activeFilterKeys(query: InventoryListQuery): InventoryFilterKey[] {
  return (["type", "status", "category", "location", "pic", "satker", "condition", "from", "to"] as const).filter((key) => Boolean(query[key]));
}

export function clearFiltersPatch(): Patch {
  return { cf: {}, type: undefined, status: undefined, category: undefined, location: undefined, pic: undefined, satker: undefined, condition: undefined, from: undefined, to: undefined };
}
