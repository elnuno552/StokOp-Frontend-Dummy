import { RowActions } from "@/components/ui/row-actions";
import { MenuLink, MenuSeparator } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { BORROWING_TABS, BORROWING_TAB_LABELS, listBorrowings, parseBorrowingTab, type BorrowingRow } from "@/lib/borrowing/list";
import { formatDate } from "@/lib/format";
import { BORROWING_STATUS_LABELS } from "@/lib/inventory/labels";
import { canMutateInventory, canViewOperations } from "@/lib/permissions";
import { ApproveButton, CancelRequestButton, RejectButton, ReturnDialog } from "./row-actions";

export const metadata: Metadata = { title: "Peminjaman" };

const STATUS_TONE: Record<BorrowingRow["status"], BadgeTone> = {
  PENDING: "warning",
  BORROWED: "accent",
  OVERDUE: "danger",
  RETURNED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

const EMPTY: Record<(typeof BORROWING_TABS)[number], string> = {
  pending: "Tidak ada permintaan yang menunggu persetujuan.",
  active: "Tidak ada peminjaman aktif.",
  overdue: "Tidak ada peminjaman yang terlambat.",
  done: "Belum ada peminjaman yang selesai.",
};

function dueText(row: BorrowingRow): { text: string; className: string } {
  if (!row.expectedReturnAt) return { text: "Tanpa batas", className: "text-muted" };
  const date = formatDate(row.expectedReturnAt);
  if (row.reminder === "OVERDUE") return { text: `${date} · terlambat`, className: "font-semibold text-danger" };
  if (row.reminder === "DUE_SOON") {
    const d = row.daysUntilDue ?? 0;
    return { text: `${date} · ${d <= 0 ? "hari ini" : `${d} hari lagi`}`, className: "font-semibold text-warning" };
  }
  return { text: date, className: "" };
}

export default async function BorrowingsPage({ searchParams }: PageProps<"/borrowings">) {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const tab = parseBorrowingTab((await searchParams).tab);
  const data = await listBorrowings(user, tab);
  const canMutate = canMutateInventory(user.role, "BMN");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Peminjaman"
        description={`Peminjaman BMN oleh pegawai maupun pihak lain. Pengingat batas pengembalian tampil ${data.reminderDays} hari sebelumnya. Peminjaman baru dicatat dari halaman barang.`}
      />

      <nav aria-label="Status peminjaman" className="flex flex-wrap gap-1.5">
        {BORROWING_TABS.map((t) => {
          const active = t === tab;
          const count = data.counts[t];
          return (
            <Link
              key={t}
              href={t === "active" ? "/borrowings" : `/borrowings?tab=${t}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-150 ${
                active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border-strong bg-surface text-fg hover:bg-surface-sunken"
              }`}
            >
              {BORROWING_TAB_LABELS[t]}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${count > 0 && (t === "overdue" || t === "pending") ? "bg-danger text-on-accent" : "bg-surface-sunken text-fg-secondary"}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {data.rows.length === 0 ? (
        <EmptyState title={EMPTY[tab]} description="Peminjaman baru dicatat dari halaman detail barang BMN, tab Peminjaman." />
      ) : (
        <div className={`${panel} relative overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{BORROWING_TAB_LABELS[tab]}</caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                {["Barang", "Peminjam", "Dasar / keperluan", tab === "done" ? "Selesai" : "Batas kembali", "Status", ""].map((h, i) => (
                  <th key={h || i} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h || <span className="sr-only">Tindakan</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => {
                const due = dueText(r);
                const open = r.status === "BORROWED" || r.status === "OVERDUE";
                return (
                  <tr key={r.id} className="align-top hover:bg-surface-sunken/60">
                    <td className="min-w-44 px-3 py-2">
                      <Link href={`/inventory/${r.itemId}`} className="font-medium text-accent hover:underline">
                        {r.itemName}
                      </Link>
                      <div className="font-mono text-xs text-muted">{r.itemCode}</div>
                    </td>
                    <td className="min-w-40 px-3 py-2">
                      <div className="font-medium text-fg">{r.borrower}</div>
                      {r.requestedBy && r.status === "PENDING" && <div className="text-xs text-muted">Diajukan oleh {r.requestedBy}</div>}
                      {r.approvedBy && r.status !== "PENDING" && r.status !== "REJECTED" && r.status !== "CANCELLED" && (
                        <div className="text-xs text-muted">Disetujui {r.approvedBy}</div>
                      )}
                    </td>
                    <td className="min-w-48 px-3 py-2 text-muted">
                      {r.basisDocument && <div className="text-fg">{r.basisDocument}</div>}
                      {r.usageType && <div>{r.usageType}</div>}
                      {r.notes && <div className="whitespace-pre-line">{r.notes}</div>}
                      {r.rejectedReason && <div className="text-danger">Ditolak: {r.rejectedReason}</div>}
                      {!r.basisDocument && !r.usageType && !r.notes && !r.rejectedReason && "—"}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 tabular-nums ${tab === "done" ? "" : due.className}`}>
                      {tab === "done" ? (r.returnedAt ? formatDate(r.returnedAt) : "—") : r.status === "PENDING" ? <span className="text-muted">{due.text}</span> : due.text}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[r.reminder === "OVERDUE" && open ? "OVERDUE" : r.status]}>
                        {r.reminder === "OVERDUE" && open ? "Terlambat" : BORROWING_STATUS_LABELS[r.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RowActions label={`${r.itemCode} ${r.itemName}`}>
                        <MenuLink href={`/inventory/${r.itemId}?tab=peminjaman`}>Lihat barang</MenuLink>
                        {r.status === "PENDING" && data.canApprove && <ApproveButton borrowingId={r.id} itemName={r.itemName} borrower={r.borrower} asMenuItem />}
                        {open && canMutate && <ReturnDialog itemId={r.itemId} borrowingId={r.id} borrowerName={r.borrower} asMenuItem />}
                        {r.status === "PENDING" && (data.canApprove || (r.mine && canMutate)) && <CancelRequestButton borrowingId={r.id} itemName={r.itemName} asMenuItem />}
                        {r.status === "PENDING" && data.canApprove && (
                          <>
                            <MenuSeparator />
                            <RejectButton borrowingId={r.id} itemName={r.itemName} borrower={r.borrower} asMenuItem />
                          </>
                        )}
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
