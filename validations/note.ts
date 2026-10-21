import { z } from "zod";

export const NOTE_MAX_LENGTH = 2000;

export const createNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Catatan wajib diisi.")
    .max(NOTE_MAX_LENGTH, `Catatan maksimal ${NOTE_MAX_LENGTH} karakter.`),
});
