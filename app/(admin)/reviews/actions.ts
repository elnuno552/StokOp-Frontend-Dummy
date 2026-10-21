"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { createReview } from "@/lib/reviews/service";
import { createReviewSchema } from "@/validations/review";

export interface ReviewFormState {
  error?: string;
  fieldErrors?: Partial<Record<"reviewerName" | "rating" | "comment", string[]>>;
  /** Changes after each successful save so the form resets. */
  saved?: number;
}

export async function submitReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  let actor;
  try {
    actor = await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }

  const parsed = createReviewSchema.safeParse({
    reviewerName: formData.get("reviewerName"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { error: "Periksa kembali isian Anda.", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await createReview(actor, parsed.data, await currentRequestIp());

  revalidatePath("/reviews");
  return { saved: Date.now() };
}
