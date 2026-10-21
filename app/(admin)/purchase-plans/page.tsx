import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonPrimary, buttonSecondary, panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { formatRupiahExact } from "@/lib/format";
import { PURCHASE_PLAN_STATUS_LABELS } from "@/lib/inventory/labels";
import { canManagePlans, listPlans } from "@/lib/purchase/service";

export const metadata: Metadata = { title: "Rencana pembelian" };

const STATUS_TONE = {
  DRAFT: "neutral",
  FINAL: "accent",
  PARTIAL: "warning",
  RECEIVED: "success",
  CANCELLED: "neutral",
} as const;

export default async function PurchasePlansPage() {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const plans = await listPlans(user);
  const canManage = canManagePlans(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rencana pembelian ATK"
        description="RAB pembelian ATK. Barang yang diterima dapat langsung masuk ke stok. Bisa diekspor ke Excel dengan format yang sama seperti RAB sebelumnya."
        actions={
          canManage ? (
            <>
              <Link href="/purchase-plans/import" className={buttonSecondary}>
                Impor dari Excel
              </Link>
              <Link href="/purchase-plans/new" className={buttonPrimary}>
                Buat RAB
              </Link>
            </>
          ) : undefined
        }
      />

      {plans.length === 0 ? (
        <EmptyState title="Belum ada rencana pembelian" description="Buat RAB baru atau impor RAB dari file Excel." />
      ) : (
        <div className={`${panel} relative overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Daftar rencana pembelian ATK</caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                {["Kode", "Judul", "Tanggal", "Baris", "Jumlah total", "Dibuat oleh", "Status"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-surface-sunken/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    <Link href={`/purchase-plans/${p.id}`} className="text-accent hover:underline">
                      {p.code}
                    </Link>
                  </td>
                  <td className="min-w-40 px-3 py-2 font-medium text-fg">{p.title}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">{p.planDateLabel}</td>
                  <td className="px-3 py-2 tabular-nums">{p.lineCount}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatRupiahExact(p.total)}</td>
                  <td className="px-3 py-2">{p.createdByName}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[p.status]}>{PURCHASE_PLAN_STATUS_LABELS[p.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
