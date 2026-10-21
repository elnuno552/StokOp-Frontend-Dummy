import { z } from "zod";
import { todayInAppZone } from "@/lib/format";
import { decimal, emptyToUndefined, ITEM_CONDITIONS } from "./item";

const notes = (max = 500) => z.preprocess(emptyToUndefined, z.string().trim().max(max, `Catatan maksimal ${max} karakter.`).optional());

const optionalName = (label: string, max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${label} maksimal ${max} karakter.`).optional());

export const BORROWER_TYPES = ["EMPLOYEE", "EXTERNAL"] as const;

// One form for both kinds of borrower: an employee, or an outside party backed by a letter (nomor surat / BAST).
export const borrowSchema = z
  .object({
    borrowerType: z.preprocess(emptyToUndefined, z.enum(BORROWER_TYPES, { error: "Pilih jenis peminjam." }).default("EMPLOYEE")),
    borrowerId: z.preprocess(emptyToUndefined, z.uuid("Pilih peminjam.").optional()),
    externalParty: optionalName("Nama pihak", 200),
    externalContact: optionalName("Kontak", 200),
    basisDocument: optionalName("Dokumen dasar", 200),
    usageType: optionalName("Jenis penggunaan", 150),
    expectedReturnAt: z.preprocess(
      emptyToUndefined,
      z.iso
        .date("Tanggal kembali tidak valid.")
        .refine((value) => value >= todayInAppZone(), "Tanggal kembali tidak boleh di masa lalu.")
        .optional(),
    ),
    notes: notes(),
  })
  .superRefine((value, ctx) => {
    if (value.borrowerType === "EMPLOYEE") {
      if (!value.borrowerId)
        ctx.addIssue({
          code: "custom",
          path: ["borrowerId"],
          message: "Pilih peminjam.",
        });
    } else {
      if (!value.externalParty)
        ctx.addIssue({
          code: "custom",
          path: ["externalParty"],
          message: "Isi nama pihak yang menggunakan.",
        });
      if (!value.basisDocument)
        ctx.addIssue({
          code: "custom",
          path: ["basisDocument"],
          message: "Isi nomor surat atau BAST sebagai dasar penggunaan.",
        });
    }
  });
export type BorrowInput = z.output<typeof borrowSchema>;

export const rejectBorrowSchema = z.object({
  reason: z.string({ error: "Isi alasan penolakan." }).trim().min(1, "Isi alasan penolakan.").max(500, "Alasan maksimal 500 karakter."),
});
export type RejectBorrowInput = z.output<typeof rejectBorrowSchema>;

export const returnSchema = z.object({
  conditionAfter: z.enum(ITEM_CONDITIONS, {
    error: "Pilih kondisi barang saat dikembalikan.",
  }),
  notes: notes(),
});
export type ReturnInput = z.output<typeof returnSchema>;

export const MAINTENANCE_EXECUTORS = ["INTERNAL", "VENDOR"] as const;

const vendorName = z.preprocess(emptyToUndefined, z.string().trim().max(150, "Nama vendor maksimal 150 karakter.").optional());

export const reportMaintenanceSchema = z
  .object({
    problem: z.string({ error: "Uraikan masalahnya." }).trim().min(1, "Uraikan masalahnya.").max(2000, "Maksimal 2000 karakter."),
    technician: z.preprocess(emptyToUndefined, z.string().trim().max(150, "Nama teknisi maksimal 150 karakter.").optional()),
    executorType: z.preprocess(emptyToUndefined, z.enum(MAINTENANCE_EXECUTORS, { error: "Pilih pelaksana perawatan." }).default("INTERNAL")),
    vendorName,
  })
  .superRefine((value, ctx) => {
    if (value.executorType === "VENDOR" && !value.vendorName) ctx.addIssue({ code: "custom", path: ["vendorName"], message: "Isi nama vendor." });
  });
export type ReportMaintenanceInput = z.output<typeof reportMaintenanceSchema>;

export const MAINTENANCE_OPS = ["start", "complete", "cancel"] as const;
export type MaintenanceOp = (typeof MAINTENANCE_OPS)[number];

export const completeMaintenanceSchema = z
  .object({
    actionTaken: z.string({ error: "Isi tindakan yang dilakukan." }).trim().min(1, "Isi tindakan yang dilakukan.").max(2000, "Maksimal 2000 karakter."),
    cost: z.preprocess(emptyToUndefined, decimal("Biaya", 2).optional()),
    technician: z.preprocess(emptyToUndefined, z.string().trim().max(150, "Nama teknisi maksimal 150 karakter.").optional()),
    conditionAfter: z.preprocess(emptyToUndefined, z.enum(ITEM_CONDITIONS, { error: "Kondisi tidak valid." }).optional()),
    // Left out: keep what was recorded when the problem was reported.
    executorType: z.preprocess(emptyToUndefined, z.enum(MAINTENANCE_EXECUTORS, { error: "Pilih pelaksana perawatan." }).optional()),
    vendorName,
  })
  .superRefine((value, ctx) => {
    if (value.executorType === "VENDOR" && !value.vendorName) ctx.addIssue({ code: "custom", path: ["vendorName"], message: "Isi nama vendor." });
  });
export type CompleteMaintenanceInput = z.output<typeof completeMaintenanceSchema>;
