import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalId = (message: string) => z.preprocess(emptyToUndefined, z.uuid(message).optional());

export const MOVEMENT_MAX_ITEMS = 100;
export const MOVEMENT_KINDS = ["IN", "OUT", "ADJUSTMENT", "TRANSFER"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

/** Accepts "2.5" or "2,5" (up to 3 decimals, matching DECIMAL(18,3)); rejects thousands separators. */
function quantity(label: string) {
  return z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    // A dot followed by exactly 3 digits ("1.500") reads as a thousands separator in Indonesian, so it is refused
    // rather than guessed. Decimals: comma with up to 3 digits, or dot with up to 2.
    .regex(/^\d{1,12}(,\d{1,3}|\.\d{1,2})?$/, `${label} harus berupa angka ≥ 0. Untuk desimal gunakan koma (contoh 2,5), tanpa titik ribuan.`)
    .transform((value) => Number(value.replace(",", ".")));
}

const description = (required: boolean) =>
  required
    ? z.string({ error: "Alasan wajib diisi." }).trim().min(1, "Alasan wajib diisi.").max(500, "Alasan maksimal 500 karakter.")
    : z.preprocess(emptyToUndefined, z.string().trim().max(500, "Keterangan maksimal 500 karakter.").optional());

const itemIds = z
  .array(z.uuid("Barang tidak valid."))
  .min(1, "Pilih minimal satu barang.")
  .max(MOVEMENT_MAX_ITEMS, `Maksimal ${MOVEMENT_MAX_ITEMS} barang sekaligus.`);

export const movementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.enum(["IN", "OUT"]),
    itemIds,
    quantity: quantity("Jumlah").refine((n) => n > 0, "Jumlah harus lebih dari 0."),
    description: description(false),
  }),
  z.object({
    kind: z.literal("ADJUSTMENT"),
    itemIds: itemIds.refine((ids) => ids.length === 1, "Penyesuaian hanya untuk satu barang."),
    quantity: quantity("Jumlah sebenarnya"),
    description: description(true),
  }),
  z
    .object({
      kind: z.literal("TRANSFER"),
      itemIds,
      toLocationId: optionalId("Lokasi tujuan tidak valid."),
      toPicId: optionalId("PIC tidak valid."),
      // PIC typed in by hand when the person is not in Data master (lib/employees/manual-pic-rules.ts).
      // "none" clears the PIC ("Belum ada PIC"); it is not an employee record.
      toPicSource: z.enum(["list", "manual", "none"]).catch("list"),
      toPicName: z.preprocess(emptyToUndefined, z.string().trim().max(150, "Nama PIC maksimal 150 karakter.").optional()),
      // Radio: "1" = also save to Data master (the default), "0" = only on these items.
      toPicSave: z.preprocess((value) => value !== "0" && value !== "false", z.boolean()),
      description: description(false),
    })
    .superRefine((v, ctx) => {
      const manual = v.toPicSource === "manual";
      if (manual && !v.toPicName) ctx.addIssue({ code: "custom", path: ["toPicName"], message: "Isi nama PIC, atau pilih PIC dari daftar." });
      if (!v.toLocationId && !(manual ? v.toPicName : v.toPicSource === "none" || v.toPicId)) {
        ctx.addIssue({ code: "custom", path: ["toLocationId"], message: "Pilih lokasi tujuan atau PIC baru." });
      }
    }),
]);

export type MovementInput = z.output<typeof movementSchema>;
export type MovementField = "quantity" | "description" | "toLocationId" | "toPicId" | "toPicName" | "itemIds";
