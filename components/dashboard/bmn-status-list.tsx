import { panel } from "@/components/ui/styles";
import type { DashboardSummary } from "@/lib/dashboard/service";
import { ITEM_STATUS_LABELS } from "@/lib/inventory/labels";

export function BmnStatusList({ byStatus }: { byStatus: DashboardSummary["bmn"]["byStatus"] }) {
  return (
    <section aria-labelledby="status-bmn" className={panel}>
      <h2 id="status-bmn" className="border-b border-border px-5 py-4 text-base font-semibold text-fg">
        Status BMN
      </h2>
      <ul className="divide-y divide-border">
        {byStatus.map(({ status, count }) => (
          <li key={status} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
            <span className={count === 0 ? "text-muted" : "text-fg"}>{ITEM_STATUS_LABELS[status]}</span>
            <span className={`tabular-nums ${count === 0 ? "text-muted" : "font-semibold text-fg"}`}>
              {count.toLocaleString("id-ID")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
