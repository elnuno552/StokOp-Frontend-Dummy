import { panel } from "./styles";

/** Placeholder block while content loads (DESIGN.md §28). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-surface-sunken ${className}`} />;
}

/** Page header plus a table-shaped placeholder, used by the loading.tsx files. */
export function PageSkeleton({ rows = 6, label = "Memuat halaman…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className={`${panel} flex flex-col gap-3 p-5`}>
        <Skeleton className="h-9 w-full max-w-sm" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
