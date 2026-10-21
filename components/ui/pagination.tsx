import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { pageList, pageRange } from "@/lib/pagination";

const pagerButton = "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums transition-colors duration-150";

type LinkProps = Omit<React.ComponentProps<typeof Link>, "children" | "className">;

/**
 * "Menampilkan a–b dari n data" plus numbered pages (DESIGN.md §32). `linkProps` builds the link of a page, so a
 * client table can add its own navigation handler. `extra` sits next to the summary (e.g. a rows-per-page picker).
 */
export function Pagination({
  label,
  page,
  pageCount,
  pageSize,
  total,
  linkProps,
  extra,
  className = "",
}: {
  label: string;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  linkProps: (page: number) => LinkProps;
  extra?: React.ReactNode;
  className?: string;
}) {
  const { first, last } = pageRange(page, pageSize, total);
  return (
    <nav aria-label={label} className={`flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <p className="tabular-nums text-muted">
          Menampilkan {first}–{last} dari {total} data
        </p>
        {extra}
      </div>

      {pageCount > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            {page > 1 ? (
              <Link {...linkProps(page - 1)} className={`${pagerButton} text-fg hover:bg-surface-sunken`} aria-label="Halaman sebelumnya">
                <ChevronLeft aria-hidden className="size-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className={`${pagerButton} text-disabled`}>
                <ChevronLeft aria-hidden className="size-4" />
              </span>
            )}
          </li>
          {pageList(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <li key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                <Link
                  {...linkProps(p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Halaman ${p}`}
                  className={`${pagerButton} ${p === page ? "bg-accent font-semibold text-on-accent" : "text-fg hover:bg-surface-sunken"}`}
                >
                  {p}
                </Link>
              </li>
            ),
          )}
          <li>
            {page < pageCount ? (
              <Link {...linkProps(page + 1)} className={`${pagerButton} text-fg hover:bg-surface-sunken`} aria-label="Halaman berikutnya">
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className={`${pagerButton} text-disabled`}>
                <ChevronRight aria-hidden className="size-4" />
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
