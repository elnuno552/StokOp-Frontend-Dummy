import type { Metadata } from "next";
import Link from "next/link";
import { BmnByCategory, BmnByCondition } from "@/components/dashboard/bmn-charts";
import { BmnStatusList } from "@/components/dashboard/bmn-status-list";
import { LowStockTable } from "@/components/dashboard/low-stock-table";
import { OngoingWork } from "@/components/dashboard/ongoing-work";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SummaryFigure } from "@/components/dashboard/summary-figure";
import { PageHeader } from "@/components/ui/page-header";
import { buttonPrimary, panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { getDashboardSummary } from "@/lib/dashboard/service";
import { formatDate, formatRupiah, formatRupiahCompact } from "@/lib/format";
import { roleLabel, canManageUsers, canViewOperations } from "@/lib/permissions";

export const metadata: Metadata = { title: "Beranda" };

// Every figure answers "what needs attention?" and comes from a real count.
export default async function HomePage() {
  const user = await requirePageAuth();
  const summary = await getDashboardSummary(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Beranda"
        description={
          <>
            Ringkasan inventaris per <span className="tabular-nums">{formatDate(new Date())}</span> · Anda masuk sebagai{" "}
            <span className="font-semibold text-fg">{roleLabel(user.role)}</span>
          </>
        }
        actions={
          canManageUsers(user.role) ? (
            <Link href="/users" className={buttonPrimary}>
              Kelola pengguna
            </Link>
          ) : undefined
        }
      />

      {summary.totalItems === 0 ? (
        <div className={`${panel} px-5 py-10 text-center`}>
          <p className="font-semibold text-fg">Belum ada data inventaris.</p>
          <p className="mt-1 text-sm text-muted">
            Ringkasan stok, status BMN, peminjaman, dan transaksi akan tampil di sini setelah barang ditambahkan.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryFigure
              label="BMN aktif"
              value={summary.bmn.active}
              detail={`${summary.bmn.borrowed} dipinjam · ${summary.bmn.underMaintenance} dalam perawatan`}
            />
            <SummaryFigure
              label="Jenis barang ATK"
              value={summary.atk.active}
              detail={`${summary.atk.outOfStock} habis`}
            />
            {summary.atk.lowStock.enabled && (
              <SummaryFigure
                label="ATK perlu diisi ulang"
                value={summary.atk.lowStock.total}
                detail={summary.atk.lowStock.total > 0 ? "Pada atau di bawah minimum" : "Semua stok aman"}
                alert={summary.atk.lowStock.total > 0}
              />
            )}
            <SummaryFigure
              label="Peminjaman aktif"
              value={summary.borrowings.active}
              detail={
                summary.borrowings.overdue.total > 0 ? (
                  <span className="font-semibold text-danger">{summary.borrowings.overdue.total} terlambat</span>
                ) : (
                  "Tidak ada yang terlambat"
                )
              }
            />
          </section>

          {(summary.bmnValue.acquisition !== null || summary.bmnValue.book !== null) && (
            <section aria-label="Nilai BMN" className="grid grid-cols-2 gap-3">
              {summary.bmnValue.acquisition !== null && (
                <SummaryFigure
                  label="Nilai perolehan BMN"
                  value={summary.bmnValue.acquisition}
                  display={formatRupiahCompact(summary.bmnValue.acquisition)}
                  detail={formatRupiah(summary.bmnValue.acquisition)}
                />
              )}
              {summary.bmnValue.book !== null && (
                <SummaryFigure
                  label="Nilai buku BMN"
                  value={summary.bmnValue.book}
                  display={formatRupiahCompact(summary.bmnValue.book)}
                  detail={formatRupiah(summary.bmnValue.book)}
                />
              )}
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BmnByCategory rows={summary.bmnByCategory} />
            <BmnByCondition rows={summary.bmnByCondition} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            {summary.atk.lowStock.enabled ? <LowStockTable lowStock={summary.atk.lowStock} /> : <div />}
            <div className="flex flex-col gap-6">
              <BmnStatusList byStatus={summary.bmn.byStatus} />
              <OngoingWork summary={summary} canOperate={canViewOperations(user.role)} />
            </div>
          </div>

          <RecentTransactions transactions={summary.recentTransactions} />
        </>
      )}
    </div>
  );
}
