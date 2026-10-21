import { Star } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { cardTitle, panel } from "@/components/ui/styles";
import { requirePageAuth, requirePageCapability } from "@/lib/auth/page";
import { listReviews } from "@/lib/reviews/service";
import { REVIEW_PAGE_SIZE, reviewQuerySchema } from "@/validations/review";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "User Review" };

function pageHref(page: number) {
  return page > 1 ? `/reviews?page=${page}` : "/reviews";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rating ${rating} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" strokeWidth={2} className={`size-4 ${n <= rating ? "fill-current text-accent" : "text-disabled"}`} />
      ))}
    </span>
  );
}

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const user = await requirePageAuth();
  // Everyone signed in may send a review; only administrators read the list.
  const admin = await requirePageCapability("manage_settings");
  const data = admin ? await listReviews(admin, reviewQuerySchema.parse(await searchParams)) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="User Review"
        description="Sampaikan penilaian dan masukan Anda tentang website ini. Ulasan dibaca oleh administrator dan tidak dapat diubah setelah dikirim."
      />

      <section aria-labelledby="form-ulasan" className={`${panel} max-w-2xl p-5`}>
        <h2 id="form-ulasan" className={`${cardTitle} mb-4`}>
          Tulis ulasan
        </h2>
        <ReviewForm defaultName={user.name} />
      </section>

      {data && (
        <section aria-labelledby="daftar-ulasan" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="daftar-ulasan" className="text-lg font-semibold text-fg">
              Ulasan masuk
            </h2>
            {data.total > 0 && (
              <p className="text-sm text-muted">
                {data.total} ulasan · rata-rata {data.average?.toFixed(1)} dari 5
              </p>
            )}
          </div>

          {data.rows.length === 0 ? (
            <EmptyState title="Belum ada ulasan" description="Ulasan yang dikirim pengguna akan tampil di sini." />
          ) : (
            <div className={panel}>
              <ul className="divide-y divide-border">
                {data.rows.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-medium text-fg">{r.reviewerName}</p>
                      <Stars rating={r.rating} />
                      <p className="text-xs tabular-nums text-muted">{r.createdAtLabel}</p>
                    </div>
                    <p className="whitespace-pre-line break-words text-sm text-fg">{r.comment}</p>
                    <p className="text-xs text-muted">
                      Dikirim dari akun {r.accountName} (<span className="font-mono">{r.accountUsername}</span>)
                    </p>
                  </li>
                ))}
              </ul>
              <Pagination
                label="Halaman ulasan"
                page={data.page}
                pageCount={data.pageCount}
                pageSize={REVIEW_PAGE_SIZE}
                total={data.total}
                linkProps={(p) => ({ href: pageHref(p) })}
                className="border-t border-border px-3 py-2.5"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
