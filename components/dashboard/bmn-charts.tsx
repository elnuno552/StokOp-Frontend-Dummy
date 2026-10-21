import { panel } from "@/components/ui/styles";
import type { DashboardSummary } from "@/lib/dashboard/service";
import { ITEM_CONDITION_LABELS } from "@/lib/inventory/labels";
import { BarChart, type ChartItem } from "./bar-chart";

// Categories have no inherent color, so they take the next one in turn; "Lainnya" is always the neutral grey.
const CATEGORY_COLORS = ["#1d4ed8", "#0e7490", "#7c3aed", "#c2410c", "#4d7c0f", "#be185d"];
const OTHER_COLOR = "#94a3b8";

// Condition has a meaning, so it keeps the status colors used elsewhere.
const CONDITION_COLOR: Record<keyof typeof ITEM_CONDITION_LABELS, string> = {
  GOOD: "var(--success)",
  MINOR_DAMAGE: "var(--warning)",
  MAJOR_DAMAGE: "var(--danger)",
  LOST: OTHER_COLOR,
};

/** BMN still held, per category (largest six, the rest merged into "Lainnya"). */
export function BmnByCategory({ rows }: { rows: DashboardSummary["bmnByCategory"] }) {
  const items: ChartItem[] = rows.map((row, i) => ({
    label: row.label,
    count: row.count,
    color: row.label === "Lainnya" ? OTHER_COLOR : CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
  return (
    <section aria-labelledby="bmn-kategori" className={panel}>
      <h2 id="bmn-kategori" className="border-b border-border px-5 py-4 text-base font-semibold text-fg">
        BMN per kategori
      </h2>
      {items.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">Belum ada BMN aktif.</p> : <BarChart items={items} label="Diagram batang jumlah BMN per kategori" />}
    </section>
  );
}

/** BMN still held, per physical condition. */
export function BmnByCondition({ rows }: { rows: DashboardSummary["bmnByCondition"] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const items: ChartItem[] = rows.map((r) => ({ label: ITEM_CONDITION_LABELS[r.condition], count: r.count, color: CONDITION_COLOR[r.condition] }));
  return (
    <section aria-labelledby="bmn-kondisi" className={panel}>
      <h2 id="bmn-kondisi" className="border-b border-border px-5 py-4 text-base font-semibold text-fg">
        Kondisi BMN
      </h2>
      {total === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">Belum ada BMN aktif.</p> : <BarChart items={items} label="Diagram batang kondisi BMN" />}
    </section>
  );
}
