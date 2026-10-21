import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonPrimary, panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { OPNAME_STATUS_LABELS } from "@/lib/inventory/labels";
import { listOpnames, mutableTypes } from "@/lib/opname/service";

export const metadata: Metadata = { title: "Stock opname" };

const STATUS_TONE = {
  DRAFT: "neutral",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
} as const;

export default async function OpnamePage() {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const opnames = await listOpnames(user);
  const canStart = mutableTypes(user).length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stock opname"
        description="Pemeriksaan fisik barang terhadap data sistem. Selisih stok ATK dapat langsung disesuaikan saat opname diselesaikan."
        actions={
          canStart ? (
            <Link href="/opname/new" className={buttonPrimary}>
              Mulai opname
            </Link>
          ) : undefined
        }
      />

      {opnames.length === 0 ? (
        <EmptyState title="Belum ada sesi opname" description="Mulai sesi untuk memeriksa stok ATK atau lokasi dan kondisi BMN." />
      ) : (
        <div className={`${panel} relative overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Daftar sesi stock opname</caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                {["Kode", "Mulai", "Lokasi", "Dibuat oleh", "Diperiksa", "Selisih", "Status"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {opnames.map((o) => (
                <tr key={o.id} className="hover:bg-surface-sunken/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    <Link href={`/opname/${o.id}`} className="text-accent hover:underline">
                      {o.code}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">{o.startedAtLabel}</td>
                  <td className="px-3 py-2">{o.locationName ?? "Semua lokasi"}</td>
                  <td className="px-3 py-2">{o.createdByName}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {o.counted} / {o.total}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 tabular-nums ${o.differences ? "font-semibold text-danger" : ""}`}>{o.differences}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[o.status]}>{OPNAME_STATUS_LABELS[o.status]}</Badge>
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
