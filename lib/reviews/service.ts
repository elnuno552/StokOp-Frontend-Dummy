import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { reviews } from "@/lib/mock/data";
import { canManageSettings } from "@/lib/permissions";
import { REVIEW_PAGE_SIZE, type ReviewQuery, type createReviewSchema } from "@/validations/review";
import type { z } from "zod";

/** Demo build: a review is accepted and not stored. */
export async function createReview(_actor: AuthContext, _input: z.output<typeof createReviewSchema>, _ipAddress: string | null) {}

/** The list is for administrators only (same gate as Pengaturan). */
export async function listReviews(actor: AuthContext, query: ReviewQuery) {
  if (!canManageSettings(actor.role)) throw new AuthorizationError();

  const sorted = [...reviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);

  return {
    total,
    page,
    pageCount,
    average: total === 0 ? null : sorted.reduce((sum, r) => sum + r.rating, 0) / total,
    rows: sorted.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE).map((r) => ({
      id: r.id,
      createdAtLabel: formatDateTime(r.createdAt),
      reviewerName: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
      accountName: r.userName,
      accountUsername: r.username,
    })),
  };
}
