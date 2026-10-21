import { z } from "zod";
import { DISPOSAL_REASONS } from "@/lib/disposal/rules";
import { emptyToUndefined } from "./item";

const text = (label: string, max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max, `${label} maksimal ${max} karakter.`).optional());
const required = (message: string, max: number) => z.string({ error: message }).trim().min(1, message).max(max, `Maksimal ${max} karakter.`);
const optionalDate = (message: string) => z.preprocess(emptyToUndefined, z.iso.date(message).optional());

export const markLostSchema = z.object({
  reason: required("Isi keterangan atau kronologi kehilangan.", 1000),
});
export type MarkLostInput = z.output<typeof markLostSchema>;

export const markFoundSchema = z.object({
  condition: z.enum(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"], { error: "Pilih kondisi barang saat ditemukan." }),
  notes: text("Catatan", 500),
});
export type MarkFoundInput = z.output<typeof markFoundSchema>;

export const proposeDisposalSchema = z.object({
  reasonType: z.enum(DISPOSAL_REASONS, { error: "Pilih alasan penghapusan." }),
  reason: required("Uraikan alasan penghapusan.", 2000),
  proposalNumber: text("Nomor usulan", 150),
  proposalDate: optionalDate("Tanggal usulan tidak valid."),
});
export type ProposeDisposalInput = z.output<typeof proposeDisposalSchema>;

// Approval needs the decision it rests on (nomor + tanggal SK); a rejection needs the reason.
export const decideDisposalSchema = z
  .object({
    outcome: z.enum(["approve", "reject"], { error: "Pilih keputusan." }),
    decisionNumber: text("Nomor keputusan", 150),
    decisionDate: optionalDate("Tanggal keputusan tidak valid."),
    decisionNotes: text("Catatan", 1000),
  })
  .superRefine((value, ctx) => {
    if (value.outcome === "approve") {
      if (!value.decisionNumber) ctx.addIssue({ code: "custom", path: ["decisionNumber"], message: "Isi nomor keputusan (SK)." });
      if (!value.decisionDate) ctx.addIssue({ code: "custom", path: ["decisionDate"], message: "Isi tanggal keputusan." });
    } else if (!value.decisionNotes) {
      ctx.addIssue({ code: "custom", path: ["decisionNotes"], message: "Isi alasan penolakan." });
    }
  });
export type DecideDisposalInput = z.output<typeof decideDisposalSchema>;
