"use client";

import { Star } from "lucide-react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, hint, input, label } from "@/components/ui/styles";
import { REVIEW_COMMENT_MAX_LENGTH, REVIEW_NAME_MAX_LENGTH } from "@/validations/review";
import { submitReviewAction, type ReviewFormState } from "./actions";

const RATINGS = [1, 2, 3, 4, 5] as const;

export function ReviewForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<ReviewFormState, FormData>(submitReviewAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} key={state.saved ?? "new"} className="flex flex-col gap-4">
      {state.saved && (
        <p role="status" className="rounded-md border border-border bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
          Terima kasih, ulasan Anda sudah terkirim.
        </p>
      )}

      <div>
        <label htmlFor="review-name" className={label}>
          Nama
        </label>
        <input
          id="review-name"
          name="reviewerName"
          type="text"
          defaultValue={defaultName}
          maxLength={REVIEW_NAME_MAX_LENGTH}
          autoComplete="name"
          required
          aria-invalid={errors.reviewerName ? true : undefined}
          aria-describedby={errors.reviewerName ? "review-name-error" : undefined}
          className={`${input} mt-1.5`}
        />
        {errors.reviewerName && (
          <p id="review-name-error" role="alert" className={fieldError}>
            {errors.reviewerName[0]}
          </p>
        )}
      </div>

      <fieldset aria-describedby={errors.rating ? "review-rating-error" : undefined}>
        <legend className={label}>Rating</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {RATINGS.map((value) => (
            <label
              key={value}
              className="relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg transition-colors duration-150 hover:bg-surface-sunken has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:checked]:text-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent sm:min-h-10"
            >
              <input type="radio" name="rating" value={value} required className="sr-only" />
              <Star aria-hidden="true" className="size-4" strokeWidth={2} />
              <span>{value}</span>
              <span className="sr-only">dari 5</span>
            </label>
          ))}
        </div>
        <p className={hint}>1 = sangat buruk, 5 = sangat baik.</p>
        {errors.rating && (
          <p id="review-rating-error" role="alert" className={fieldError}>
            {errors.rating[0]}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="review-comment" className={label}>
          Ulasan
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={5}
          maxLength={REVIEW_COMMENT_MAX_LENGTH}
          required
          placeholder="Ceritakan pengalaman Anda memakai website ini: yang sudah baik, yang membingungkan, atau yang perlu diperbaiki."
          aria-invalid={errors.comment ? true : undefined}
          aria-describedby={errors.comment ? "review-comment-error" : undefined}
          className={`${input} mt-1.5 py-2`}
        />
        {errors.comment && (
          <p id="review-comment-error" role="alert" className={fieldError}>
            {errors.comment[0]}
          </p>
        )}
      </div>

      <div>
        <SubmitButton pendingLabel="Mengirim…">Kirim ulasan</SubmitButton>
      </div>
    </form>
  );
}
