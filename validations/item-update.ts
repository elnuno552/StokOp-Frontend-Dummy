import { z } from "zod";
import { todayInAppZone } from "@/lib/format";
import { decimal, emptyToUndefined, ITEM_CONDITIONS, optionalId, optionalText } from "./item";

// Editing changes descriptive fields only. Quantity, status, location and PIC change through
// stock movements / transfers so every change leaves a transaction and a History Log entry.
const common = {
  name: z
    .string({ error: "Nama barang wajib diisi." })
    .trim()
    .min(1, "Nama barang wajib diisi.")
    .max(255, "Nama barang maksimal 255 karakter."),
  categoryId: optionalId("Kategori tidak valid."),
  brand: optionalText(150, "Merek"),
  model: optionalText(150, "Model"),
  description: optionalText(2000, "Keterangan"),
};

const optionalWhole = (min: number, label: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{1,9}$/, `${label} harus bilangan bulat.`)
      .transform(Number)
      .refine((n) => n >= min, `${label} minimal ${min}.`)
      .optional(),
  );

const optionalPastDate = (label: string) =>
  z.preprocess(emptyToUndefined, z.iso.date(`${label} tidak valid.`).optional());

export const updateBmnSchema = z.object({
  ...common,
  // Register data as exported by SIMAN (Daftar Aset). All optional.
  kodeSatker: optionalText(50, "Kode Satker"),
  kodeBarang: optionalText(20, "Kode Barang"),
  nup: optionalWhole(1, "NUP"),
  kodeRegister: optionalText(64, "Kode Register"),
  umurAset: optionalWhole(0, "Umur aset"),
  tanggalBukuPertama: optionalPastDate("Tanggal buku pertama"),
  nilaiPerolehanPertama: z.preprocess(emptyToUndefined, decimal("Nilai perolehan pertama", 2).optional()),
  // A mutation can reduce the value, so this one may be negative.
  nilaiMutasi: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^-?\d{1,15}([.,]\d{1,2})?$/, "Nilai mutasi harus berupa angka dengan paling banyak 2 angka desimal.")
      .transform((value) => Number(value.replace(",", ".")))
      .optional(),
  ),
  nilaiPenyusutan: z.preprocess(emptyToUndefined, decimal("Nilai penyusutan", 2).optional()),
  nilaiBuku: z.preprocess(emptyToUndefined, decimal("Nilai buku", 2).optional()),
  statusPenggunaan: optionalText(150, "Status penggunaan"),
  noPsp: optionalText(100, "No. PSP"),
  tanggalPsp: optionalPastDate("Tanggal PSP"),
  serialNumber: optionalText(150, "Nomor seri"),
  condition: z.preprocess(emptyToUndefined, z.enum(ITEM_CONDITIONS, { error: "Kondisi tidak valid." }).optional()),
  acquisitionDate: z.preprocess(
    emptyToUndefined,
    z.iso
      .date("Tanggal perolehan tidak valid.")
      .refine((value) => value <= todayInAppZone(), "Tanggal perolehan tidak boleh di masa depan.")
      .optional(),
  ),
  acquisitionPrice: z.preprocess(emptyToUndefined, decimal("Harga perolehan", 2).optional()),
  fundingSource: optionalText(150, "Sumber dana"),
});

export const updateAtkSchema = z.object({
  ...common,
  unit: z
    .string({ error: "Satuan wajib diisi untuk ATK." })
    .trim()
    .min(1, "Satuan wajib diisi untuk ATK.")
    .max(50, "Satuan maksimal 50 karakter."),
  minimumStock: z.preprocess(emptyToUndefined, decimal("Stok minimum", 3).optional()),
});

export type UpdateBmnInput = z.output<typeof updateBmnSchema>;
export type UpdateAtkInput = z.output<typeof updateAtkSchema>;
export type UpdateItemField =
  | "name"
  | "categoryId"
  | "brand"
  | "model"
  | "description"
  | "serialNumber"
  | "condition"
  | "acquisitionDate"
  | "acquisitionPrice"
  | "fundingSource"
  | "kodeSatker"
  | "kodeBarang"
  | "nup"
  | "kodeRegister"
  | "umurAset"
  | "tanggalBukuPertama"
  | "nilaiPerolehanPertama"
  | "nilaiMutasi"
  | "nilaiPenyusutan"
  | "nilaiBuku"
  | "statusPenggunaan"
  | "noPsp"
  | "tanggalPsp"
  | "unit"
  | "minimumStock"
  | `cf:${string}`;
