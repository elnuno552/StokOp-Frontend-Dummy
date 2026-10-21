import { RowActions } from "@/components/ui/row-actions";
import { MenuLink, MenuSeparator } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { panel } from "@/components/ui/styles";
import { APPROVAL_KIND_INFO, APPROVAL_STATUS_LABELS } from "@/lib/approvals/rules";
import { APPROVAL_TABS, listApprovals, parseApprovalTab, type ApprovalRow } from "@/lib/approvals/service";
import { requirePageAuth } from "@/lib/auth/page";
import { canViewOperations } from "@/lib/permissions";
import { ApproveRequestButton, CancelRequestButton, RejectRequestButton } from "./row-actions";

export const metadata: Metadata = { title: "Persetujuan" };

const TAB_LABELS = { pending: "Menunggu", done: "Selesai" } as const;

const STATUS_TONE: Record<ApprovalRow["status"], BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const tab = parseApprovalTab((await searchParams).tab);
  const data = await listApprovals(user, tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Persetujuan"
        description="Tindakan yang diwajibkan persetujuan menunggu di sini dan baru berlaku setelah disetujui. Peminjaman diproses di menu Peminjaman."
      />

      <nav aria-label="Status permintaan" className="flex flex-wrap gap-1.5">
        {APPROVAL_TABS.map((t) => (
          <Link
            key={t}
            href={t === "pending" ? "/approvals" : `/approvals?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-150 ${
              t === tab ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border-strong bg-surface text-fg hover:bg-surface-sunken"
            }`}
          >
            {TAB_LABELS[t]}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${t === "pending" && data.counts.pending > 0 ? "bg-danger text-on-accent" : "bg-surface-sunken text-fg-secondary"}`}>{data.counts[t]}</span>
          </Link>
        ))}
      </nav>

      {data.rows.length === 0 ? (
        <EmptyState
          title={tab === "pending" ? "Tidak ada permintaan yang menunggu" : "Belum ada permintaan yang selesai"}
          description={tab === "pending" ? "Tindakan yang wajib disetujui muncul di sini setelah diajukan." : "Permintaan yang disetujui, ditolak, atau dibatalkan tercatat di sini."}
        />
      ) : (
        <div className={`${panel} relative overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{TAB_LABELS[tab]}</caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                {["Jenis", "Permintaan", "Diajukan", "Status", ""].map((h, i) => (
                  <th key={h || i} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h || <span className="sr-only">Tindakan</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-surface-sunken/60">
                  <td className="min-w-40 whitespace-nowrap px-3 py-2 font-medium text-fg">{APPROVAL_KIND_INFO[r.kind].label}</td>
                  <td className="min-w-64 px-3 py-2">
                    {r.itemId ? (
                      <Link href={`/inventory/${r.itemId}`} className="text-fg hover:text-accent hover:underline">
                        {r.summary}
                      </Link>
                    ) : r.planId ? (
                      <Link href={`/purchase-plans/${r.planId}`} className="text-fg hover:text-accent hover:underline">
                        {r.summary}
                      </Link>
                    ) : (
                      r.summary
                    )}
                    {r.rejectedReason && <p className="mt-1 text-danger">Ditolak: {r.rejectedReason}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    <div className="text-fg">{r.requestedBy ?? "—"}</div>
                    <div className="text-xs tabular-nums">{r.createdAtLabel}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[r.status]}>{APPROVAL_STATUS_LABELS[r.status]}</Badge>
                    {r.decidedBy && r.status !== "PENDING" && (
                      <div className="mt-1 text-xs text-muted">
                        {r.decidedBy} · {r.decidedAtLabel}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "PENDING" && (data.canApprove || r.mine) && (
                      <RowActions label={r.summary}>
                        {r.itemId && <MenuLink href={`/inventory/${r.itemId}`}>Lihat barang</MenuLink>}
                        {r.planId && <MenuLink href={`/purchase-plans/${r.planId}`}>Lihat RAB</MenuLink>}
                        {data.canApprove && <ApproveRequestButton id={r.id} summary={r.summary} asMenuItem />}
                        <CancelRequestButton id={r.id} summary={r.summary} asMenuItem />
                        {data.canApprove && (
                          <>
                            <MenuSeparator />
                            <RejectRequestButton id={r.id} summary={r.summary} asMenuItem />
                          </>
                        )}
                      </RowActions>
                    )}
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
