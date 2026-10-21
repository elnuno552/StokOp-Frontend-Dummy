import { z } from "zod";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export const OPNAME_ITEM_LIMIT = 2000;

export const OPNAME_MODES = ["STANDARD", "LOCATION_SURVEY"] as const;

export const createOpnameSchema = z
  .object({
    mode: z.preprocess(emptyToUndefined, z.enum(OPNAME_MODES, { error: "Mode tidak valid." }).default("STANDARD")),
    categoryId: z.preprocess(emptyToUndefined, z.uuid("Kategori tidak valid.").optional()),
    locationId: z.preprocess(emptyToUndefined, z.uuid("Lokasi tidak valid.").optional()),
    type: z.preprocess(emptyToUndefined, z.enum(["BMN", "ATK"], { error: "Tipe tidak valid." }).optional()),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional()),
  })
  .superRefine((value, ctx) => {
    // Location survey: BMN assets without a location, recorded room by room.
    if (value.mode === "LOCATION_SURVEY" && !value.locationId) {
      ctx.addIssue({ code: "custom", path: ["locationId"], message: "Pilih ruangan yang sedang didata." });
    }
    if (value.mode === "LOCATION_SURVEY" && value.type === "ATK") {
      ctx.addIssue({ code: "custom", path: ["type"], message: "Pendataan lokasi hanya untuk BMN." });
    }
  });

export type CreateOpnameInput = z.output<typeof createOpnameSchema>;

/** Counted quantity: "2,5" (comma, up to 3 decimals) or "2.5" (dot, up to 2). "1.500" is refused as ambiguous. */
export const countedQuantity = z
  .string()
  .trim()
  .regex(/^\d{1,12}(,\d{1,3}|\.\d{1,2})?$/, "Jumlah harus berupa angka ≥ 0. Untuk desimal gunakan koma (contoh 2,5), tanpa titik ribuan.")
  .transform((value) => Number(value.replace(",", ".")));

export const CONDITIONS = ["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"] as const;

export const opnameListQuerySchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional().catch(undefined),
});
