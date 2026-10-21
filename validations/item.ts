import { z } from "zod";
import { todayInAppZone } from "@/lib/format";

/** Treat empty form fields as "not provided". */
export const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const optionalText = (max: number, label: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${label} maksimal ${max} karakter.`).optional());

export const optionalId = (message: string) => z.preprocess(emptyToUndefined, z.uuid(message).optional());

/** Accepts "2.5" or "2,5"; rejects thousands separators so "1.500" is never misread. */
export function decimal(label: string, fractionDigits: number) {
  const pattern = new RegExp(`^\\d{1,15}([.,]\\d{1,${fractionDigits}})?$`);
  return z
    .string()
    .trim()
    .regex(pattern, `${label} harus berupa angka ≥ 0 dengan paling banyak ${fractionDigits} angka desimal.`)
    .transform((value) => Number(value.replace(",", ".")));
}

export const BMN_INITIAL_STATUSES = ["AVAILABLE", "IN_USE"] as const;
export const ITEM_CONDITIONS = ["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"] as const;

export const ITEM_CODE_MAX = 100;

const base = {
  codeMode: z.enum(["auto", "manual"]).catch("auto"),
  code: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Kode minimal 3 karakter.")
      .max(ITEM_CODE_MAX, `Kode maksimal ${ITEM_CODE_MAX} karakter.`)
      .regex(/^[A-Z0-9][A-Z0-9./_-]*$/, "Gunakan huruf, angka, titik, garis miring, garis bawah, atau tanda hubung.")
      .optional(),
  ),
  name: z
    .string({ error: "Nama barang wajib diisi." })
    .trim()
    .min(1, "Nama barang wajib diisi.")
    .max(255, "Nama barang maksimal 255 karakter."),
  categoryId: optionalId("Kategori tidak valid."),
  locationId: optionalId("Lokasi tidak valid."),
  brand: optionalText(150, "Merek"),
  model: optionalText(150, "Model"),
  description: optionalText(2000, "Keterangan"),
};

const bmnSchema = z.object({
  ...base,
  type: z.literal("BMN"),
  picId: optionalId("PIC tidak valid."),
  // PIC typed in by hand when the person is not in Data master (see lib/employees/manual-pic-rules.ts).
  picSource: z.enum(["list", "manual"]).catch("list"),
  picManualName: optionalText(150, "Nama PIC"),
  // Radio: "1" = also save to Data master (the default), "0" = only on this item.
  picSave: z.preprocess((value) => value !== "0" && value !== "false", z.boolean()),
  serialNumber: optionalText(150, "Nomor seri"),
  status: z.enum(BMN_INITIAL_STATUSES, { error: "Pilih status: Tersedia atau Digunakan." }),
  condition: z.enum(ITEM_CONDITIONS, { error: "Pilih kondisi barang." }),
  acquisitionDate: z.preprocess(
    emptyToUndefined,
    z.iso
      .date("Tanggal perolehan tidak valid.")
      .refine((value) => value <= todayInAppZone(), "Tanggal perolehan tidak boleh di masa depan.")
      .optional(),
  ),
  acquisitionPrice: z.preprocess(emptyToUndefined, decimal("Harga perolehan", 2).optional()),
  fundingSource: optionalText(150, "Sumber dana"),
  // SIMAN register data, optional: assets are added by hand when they are not in the latest SIMAN export.
  kodeSatker: optionalText(50, "Kode Satker"),
  kodeBarang: optionalText(20, "Kode Barang"),
  nup: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^[0-9]{1,9}$/, "NUP harus bilangan bulat, minimal 1.")
      .transform(Number)
      .refine((n) => n >= 1, "NUP harus bilangan bulat, minimal 1.")
      .optional(),
  ),
  kodeRegister: optionalText(64, "Kode Register"),
  nilaiPerolehanPertama: z.preprocess(emptyToUndefined, decimal("Nilai perolehan pertama", 2).optional()),
  nilaiBuku: z.preprocess(emptyToUndefined, decimal("Nilai buku", 2).optional()),
  statusPenggunaan: optionalText(150, "Status penggunaan"),
  noPsp: optionalText(100, "Nomor PSP"),
  tanggalPsp: z.preprocess(emptyToUndefined, z.iso.date("Tanggal PSP tidak valid.").optional()),
});

const atkSchema = z.object({
  ...base,
  type: z.literal("ATK"),
  unit: z
    .string({ error: "Satuan wajib diisi untuk ATK." })
    .trim()
    .min(1, "Satuan wajib diisi untuk ATK.")
    .max(50, "Satuan maksimal 50 karakter."),
  initialStock: z.preprocess((value) => emptyToUndefined(value) ?? "0", decimal("Stok awal", 3)),
  minimumStock: z.preprocess(emptyToUndefined, decimal("Stok minimum", 3).optional()),
});

export const createItemSchema = z
  .discriminatedUnion("type", [bmnSchema, atkSchema], { error: "Pilih jenis barang: BMN atau ATK." })
  .superRefine((data, ctx) => {
    if (data.codeMode === "manual" && !data.code) {
      ctx.addIssue({ code: "custom", path: ["code"], message: "Isi kode barang, atau pilih kode otomatis." });
    }
    if (data.type === "BMN" && data.picSource === "manual" && !data.picManualName) {
      ctx.addIssue({ code: "custom", path: ["picManualName"], message: "Isi nama PIC, atau pilih PIC dari daftar." });
    }
    // An asset is identified by Satker + Kode Barang + NUP together; a partial key could never be matched later.
    if (data.type === "BMN" && (data.kodeSatker || data.kodeBarang || data.nup !== undefined)) {
      const together = "Isi Kode Satker, Kode Barang, dan NUP bersamaan.";
      if (!data.kodeSatker) ctx.addIssue({ code: "custom", path: ["kodeSatker"], message: together });
      if (!data.kodeBarang) ctx.addIssue({ code: "custom", path: ["kodeBarang"], message: together });
      if (data.nup === undefined) ctx.addIssue({ code: "custom", path: ["nup"], message: together });
    }
  })
  // Auto mode ignores any typed code; the PIC comes from the list or from the typed name, never both.
  .transform((data) => {
    const code = data.codeMode === "manual" ? data.code : undefined;
    if (data.type !== "BMN") return { ...data, code };
    return data.picSource === "manual" ? { ...data, code, picId: undefined } : { ...data, code, picManualName: undefined };
  });

export type CreateItemInput = z.output<typeof createItemSchema>;
export type CreateItemField =
  | "type"
  | "code"
  | "name"
  | "categoryId"
  | "locationId"
  | "picId"
  | "picManualName"
  | "brand"
  | "model"
  | "serialNumber"
  | "status"
  | "condition"
  | "acquisitionDate"
  | "acquisitionPrice"
  | "fundingSource"
  | "kodeSatker"
  | "kodeBarang"
  | "nup"
  | "kodeRegister"
  | "nilaiPerolehanPertama"
  | "nilaiBuku"
  | "statusPenggunaan"
  | "noPsp"
  | "tanggalPsp"
  | "unit"
  | "initialStock"
  | "minimumStock"
  | "description"
  | "image"
  | `cf:${string}`;

// ---------------------------------------------------------------------------
// Image upload (PRD §3.6): max 5 MB, JPG / PNG / HEIC, validated by content.
// ---------------------------------------------------------------------------

export const ITEM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type DetectedImage = { mimeType: "image/jpeg" | "image/png" | "image/heic"; extension: "jpg" | "png" | "heic" };

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

/** Detect the real image type from its first bytes. The browser's name and MIME type are not trusted. */
export function detectImageType(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) {
    return { mimeType: "image/png", extension: "png" };
  }
  // ISO BMFF: bytes 4..8 are "ftyp", followed by the major brand.
  if (bytes.length >= 12) {
    const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
    if (ascii(4, 8) === "ftyp" && HEIC_BRANDS.has(ascii(8, 12))) return { mimeType: "image/heic", extension: "heic" };
  }
  return null;
}
