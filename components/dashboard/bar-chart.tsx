import { barShare, percent } from "@/lib/dashboard/chart";

export interface ChartItem {
  label: string;
  count: number;
  /** Fill of the bar (a hex color or CSS variable). */
  color: string;
}

/**
 * Horizontal bars, one row per item, each sized by its share of the total. Label, count and share are always
 * written out, so the chart never depends on color alone; zero rows are listed (muted) with an empty track.
 */
export function BarChart({ items, label }: { items: readonly ChartItem[]; label: string }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <ul aria-label={label} className="flex flex-col gap-3.5 px-5 py-5">
      {items.map((item) => {
        const text = `${item.count.toLocaleString("id-ID")} · ${percent(item.count, total)}%`;
        return (
          <li key={item.label} title={`${item.label}: ${text}`} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={`min-w-0 truncate ${item.count === 0 ? "text-muted" : "text-fg"}`}>{item.label}</span>
              <span className={`shrink-0 tabular-nums ${item.count === 0 ? "text-muted" : "text-fg-secondary"}`}>{text}</span>
            </div>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full" style={{ width: `${barShare(item.count, total)}%`, backgroundColor: item.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
