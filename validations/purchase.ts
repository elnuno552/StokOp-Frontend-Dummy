import { z } from "zod";
import { parseLink, parseMoney, parseVolume } from "@/lib/purchase/parse";
import { percentToFactor } from "@/lib/purchase/calc";
import { emptyToUndefined } from "./item";

export const PURCHASE_MAX_LINES = 200;

const money = (label: string) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .transform((value, ctx) => {
      const parsed = parseMoney(value);
      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", message: `${label} harus berupa angka ≥ 0 (contoh 16900 atau 16.900).` });
        return z.NEVER;
      }
      return parsed.value;
    });

const percent = (label: string, max: number) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .regex(/^\d{1,4}([.,]\d{1,2})?$/, `${label} harus berupa angka ≥ 0 dengan paling banyak 2 desimal.`)
    .transform((value) => Number(value.replace(",", ".")))
    .refine((n) => n <= max, `${label} maksimal ${max}.`);

export const planHeaderSchema = z.object({
  title: z.string({ error: "Judul wajib diisi." }).trim().min(1, "Judul wajib diisi.").max(255, "Judul maksimal 255 karakter."),
  planDate: z.iso.date("Tanggal tidak valid."),
  /** Typed as a percent added to the unit price (15); the parsed output is the factor (1.15). */
  pricePercent: percent("Kenaikan harga", 1000).transform(percentToFactor),
  ppnRate: percent("PPN", 100),
  rounding: z.preprocess(emptyToUndefined, money("Pembulatan").optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional()),
});
export type PlanHeaderInput = z.output<typeof planHeaderSchema>;
export type PlanHeaderField = "title" | "planDate" | "pricePercent" | "ppnRate" | "rounding" | "notes";

export const planLineSchema = z.object({
  /** Present for a line that is already saved, so its photo and link to an item survive an edit. */
  id: z.preprocess(emptyToUndefined, z.uuid().optional()),
  itemId: z.preprocess(emptyToUndefined, z.uuid("Barang ATK tidak valid.").optional()),
  description: z.string({ error: "Uraian wajib diisi." }).trim().min(1, "Uraian wajib diisi.").max(500, "Uraian maksimal 500 karakter."),
  volume: z.string({ error: "Volume wajib diisi." }).transform((value, ctx) => {
    const parsed = parseVolume(value);
    if (!parsed.ok || parsed.value <= 0) {
      ctx.addIssue({ code: "custom", message: "Volume harus angka lebih dari 0. Untuk desimal gunakan koma (contoh 2,5)." });
      return z.NEVER;
    }
    return parsed.value;
  }),
  unit: z.string({ error: "Satuan wajib diisi." }).trim().min(1, "Satuan wajib diisi.").max(50, "Satuan maksimal 50 karakter."),
  unitPrice: money("Harga satuan"),
  shippingCost: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? "0" : v), money("Biaya pengiriman")),
  link: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()).transform((value, ctx) => {
    const parsed = parseLink(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: "Link harus diawali http:// atau https://." });
      return z.NEVER;
    }
    return parsed.value;
  }),
});
export type PlanLineInput = z.output<typeof planLineSchema>;

export const planLinesSchema = z.array(planLineSchema).max(PURCHASE_MAX_LINES, `Maksimal ${PURCHASE_MAX_LINES} baris.`);

export const receiveSchema = z.record(
  z.uuid(),
  z
    .string()
    .trim()
    .regex(/^\d{0,12}(,\d{1,3}|\.\d{1,2})?$/, "Jumlah tidak valid.")
    .transform((value) => (value === "" ? 0 : Number(value.replace(",", ".")))),
);
