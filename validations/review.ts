import { z } from "zod";

export const REVIEW_NAME_MAX_LENGTH = 100;
export const REVIEW_COMMENT_MAX_LENGTH = 2000;
export const REVIEW_PAGE_SIZE = 20;

export const createReviewSchema = z.object({
  reviewerName: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(REVIEW_NAME_MAX_LENGTH, `Nama maksimal ${REVIEW_NAME_MAX_LENGTH} karakter.`),
  rating: z.coerce
    .number({ error: "Pilih rating 1 sampai 5." })
    .int("Pilih rating 1 sampai 5.")
    .min(1, "Pilih rating 1 sampai 5.")
    .max(5, "Pilih rating 1 sampai 5."),
  comment: z
    .string()
    .trim()
    .min(1, "Ulasan wajib diisi.")
    .max(REVIEW_COMMENT_MAX_LENGTH, `Ulasan maksimal ${REVIEW_COMMENT_MAX_LENGTH} karakter.`),
});

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
});

export type ReviewQuery = z.output<typeof reviewQuerySchema>;
