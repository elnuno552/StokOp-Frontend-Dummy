import Link from "next/link";
import { panel } from "@/components/ui/styles";
import type { DashboardSummary } from "@/lib/dashboard/service";
import { formatDate } from "@/lib/format";

export function OngoingWork({ summary, canOperate = true }: { summary: DashboardSummary; canOperate?: boolean }) {
  const { overdue } = summary.borrowings;
  const { dueSoon, pendingApproval, days } = summary.reminders;
  const remaining = overdue.total - overdue.rows.length;
  const dueSoonRemaining = dueSoon.total - dueSoon.rows.length;

  return (
    <section aria-labelledby="pekerjaan-berjalan" className={panel}>
      <h2 id="pekerjaan-berjalan" className="border-b border-border px-5 py-4 text-base font-semibold text-fg">
        Pekerjaan berjalan
      </h2>
      <dl className="divide-y divide-border text-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <dt className="text-fg">Perawatan belum selesai</dt>
          <dd className="font-semibold tabular-nums text-fg">{summary.openMaintenance}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <dt className="text-fg">
            {canOperate ? (
              <Link href="/opname" className="hover:underline">
                Stok opname berlangsung
              </Link>
            ) : (
              "Stok opname berlangsung"
            )}
          </dt>
          <dd className="font-semibold tabular-nums text-fg">{summary.openOpnames}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <dt className="text-fg">Peminjaman terlambat</dt>
          <dd className={`font-semibold tabular-nums ${overdue.total > 0 ? "text-danger" : "text-fg"}`}>
            {overdue.total}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <dt className="text-fg">Usulan penghapusan berjalan</dt>
          <dd className="font-semibold tabular-nums text-fg">{summary.openDisposals}</dd>
        </div>
        {summary.approvalsPending > 0 && (
          <div className="flex items-center justify-between gap-4 px-5 py-2.5">
            <dt className="text-fg">
              <Link href="/approvals" className="hover:underline">
                Permintaan menunggu persetujuan
              </Link>
            </dt>
            <dd className="font-semibold tabular-nums text-warning">{summary.approvalsPending}</dd>
          </div>
        )}
        {pendingApproval > 0 && (
          <div className="flex items-center justify-between gap-4 px-5 py-2.5">
            <dt className="text-fg">
              <Link href="/borrowings?tab=pending" className="hover:underline">
                Peminjaman menunggu persetujuan
              </Link>
            </dt>
            <dd className="font-semibold tabular-nums text-warning">{pendingApproval}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <dt className="text-fg">Jatuh tempo ≤ {days} hari</dt>
          <dd className={`font-semibold tabular-nums ${dueSoon.total > 0 ? "text-warning" : "text-fg"}`}>{dueSoon.total}</dd>
        </div>
      </dl>

      {dueSoon.rows.length > 0 && (
        <ul className="divide-y divide-border border-t border-border text-sm" aria-label="Peminjaman segera jatuh tempo">
          {dueSoon.rows.map((row) => (
            <li key={row.id} className="px-5 py-2.5">
              <Link href={`/inventory/${row.itemId}`} className="font-medium text-fg hover:underline">
                {row.itemName}
              </Link>
              <p className="text-muted">
                <span className="font-mono text-xs">{row.itemCode}</span> · {row.borrower}
                {row.expectedReturnAt && (
                  <>
                    {" "}
                    · <span className="tabular-nums text-warning">kembali {formatDate(row.expectedReturnAt)}</span>
                  </>
                )}
              </p>
            </li>
          ))}
          {dueSoonRemaining > 0 && <li className="px-5 py-2.5 tabular-nums text-muted">dan {dueSoonRemaining} lainnya</li>}
        </ul>
      )}

      {overdue.rows.length > 0 && (
        <ul className="divide-y divide-border border-t border-border text-sm" aria-label="Peminjaman terlambat">
          {overdue.rows.map((row) => (
            <li key={row.id} className="px-5 py-2.5">
              <Link href={`/inventory/${row.itemId}`} className="font-medium text-fg hover:underline">
                {row.itemName}
              </Link>
              <p className="text-muted">
                <span className="font-mono text-xs">{row.itemCode}</span> · {row.borrower}
                {row.expectedReturnAt && (
                  <>
                    {" "}
                    · <span className="tabular-nums text-danger">jatuh tempo {formatDate(row.expectedReturnAt)}</span>
                  </>
                )}
              </p>
            </li>
          ))}
          {remaining > 0 && <li className="px-5 py-2.5 tabular-nums text-muted">dan {remaining} lainnya</li>}
        </ul>
      )}
    </section>
  );
}
