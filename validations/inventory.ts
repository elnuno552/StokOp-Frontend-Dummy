import { z } from "zod";
import { ItemStatus } from "@/lib/generated/prisma/enums";

/** Treat empty query values as "not provided". */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional()).catch(undefined);

export const INVENTORY_PAGE_SIZES = [10, 20] as const;

export const INVENTORY_SORT_KEYS = [
  "code",
  "kodeBarang",
  "name",
  "brand",
  "type",
  "category",
  "location",
  "pic",
  "quantity",
  "status",
  "condition",
  "acquisitionDate",
  "acquisitionPrice",
  "nilaiBuku",
  "createdAt",
] as const;
export type InventorySortKey = (typeof INVENTORY_SORT_KEYS)[number];

/** List query from the URL. Invalid values fall back to defaults instead of erroring. */
export const inventoryListQuerySchema = z.object({
  q: optional(z.string().trim().max(100)),
  type: optional(z.enum(["BMN", "ATK"])),
  status: optional(z.enum(ItemStatus)),
  category: optional(z.uuid()),
  location: optional(z.uuid()),
  pic: optional(z.uuid()),
  /** Kode Satker (BMN register). */
  satker: optional(z.string().trim().max(50)),
  condition: optional(z.enum(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"])),
  /** Date added (created_at), inclusive, as YYYY-MM-DD in the app time zone. */
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
  /** Custom field filters (Pengaturan > Kolom kustom), by field id. Only used together with a category filter. */
  cf: z.record(z.string(), z.string().trim().max(100)).catch({}),
  sort: z.enum(INVENTORY_SORT_KEYS).catch("code"),
  dir: z.enum(["asc", "desc"]).catch("asc"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n): n is (typeof INVENTORY_PAGE_SIZES)[number] => (INVENTORY_PAGE_SIZES as readonly number[]).includes(n))
    .catch(10),
});

export type InventoryListQuery = z.output<typeof inventoryListQuerySchema>;

export const CUSTOM_FILTER_PREFIX = "cf.";

/** Gather the `cf.<fieldId>=value` search params into the `cf` object the schema expects. */
export function withCustomFilters(raw: Record<string, unknown>): Record<string, unknown> {
  const cf: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const text = Array.isArray(value) ? value[0] : value;
    if (key.startsWith(CUSTOM_FILTER_PREFIX) && typeof text === "string" && text.trim() !== "") cf[key.slice(CUSTOM_FILTER_PREFIX.length)] = text;
  }
  return { ...raw, cf };
}

export const INVENTORY_FILTER_KEYS = ["type", "status", "category", "location", "pic", "satker", "condition", "from", "to"] as const;
export type InventoryFilterKey = (typeof INVENTORY_FILTER_KEYS)[number];

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export const EXPORT_MAX_SELECTED = 100;

/** Export request: the list filters plus format and an optional explicit selection. */
export const inventoryExportQuerySchema = inventoryListQuerySchema.extend({
  format: z.enum(EXPORT_FORMATS).catch("xlsx"),
  /** "aset" = the SIMAN Daftar Aset layout (BMN only). */
  layout: z.enum(["standard", "aset"]).catch("standard"),
  ids: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value.split(",") : undefined),
    z.array(z.uuid()).min(1).max(EXPORT_MAX_SELECTED).optional(),
  ),
});

export type InventoryExportQuery = z.output<typeof inventoryExportQuerySchema>;
