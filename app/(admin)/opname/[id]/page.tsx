import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";
import { panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { locations as locationRows } from "@/lib/mock/data";
import { OPNAME_STATUS_LABELS } from "@/lib/inventory/labels";
import { getOpname } from "@/lib/opname/service";
import { CountSheet, FinishPanel } from "./count-sheet";

export const metadata: Metadata = { title: "Detail opname" };

export default async function OpnameDetailPage({ params }: PageProps<"/opname/[id]">) {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const opname = await getOpname(user, id);
  if (!opname) notFound();
  const locations = [...locationRows].sort((a, b) => a.name.localeCompare(b.name, "id")).map((l) => ({ id: l.id, name: l.name }));
  const pending = opname.rows.length - opname.counted;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/opname" className="w-fit text-sm font-medium text-accent hover:underline">
        ← Stock opname
      </Link>
      <PageHeader
        title={opname.code}
        description={
          <>
            {opname.mode === "LOCATION_SURVEY" ? "Pendataan lokasi · " : ""}
            {OPNAME_STATUS_LABELS[opname.status]} · dimulai {opname.startedAtLabel} oleh {opname.createdByName}
            {opname.completedAtLabel ? ` · selesai ${opname.completedAtLabel}` : ""}
          </>
        }
      />

      <ul className="flex flex-wrap gap-3 text-sm" aria-label="Ringkasan opname">
        <li className={`${panel} px-4 py-2`}>
          <span className="text-muted">{opname.mode === "LOCATION_SURVEY" ? "Ruangan didata" : "Lokasi"}</span>{" "}
          <span className="font-medium text-fg">{opname.locationName ?? "Semua lokasi"}</span>
        </li>
        <li className={`${panel} px-4 py-2 tabular-nums`}>
          <span className="text-muted">Diperiksa</span>{" "}
          <span className="font-medium text-fg">
            {opname.counted} / {opname.rows.length}
          </span>
        </li>
        <li className={`${panel} px-4 py-2 tabular-nums`}>
          <span className="text-muted">Selisih</span>{" "}
          <span className={`font-medium ${opname.differences ? "text-danger" : "text-fg"}`}>{opname.differences}</span>
        </li>
        {opname.bmnApplied && (
          <li className={`${panel} px-4 py-2`}>
            <span className="font-medium text-success">Hasil diterapkan ke data BMN</span>
          </li>
        )}
        {opname.notes && (
          <li className={`${panel} px-4 py-2`}>
            <span className="text-muted">Catatan</span> <span className="text-fg">{opname.notes}</span>
          </li>
        )}
      </ul>

      <CountSheet opnameId={opname.id} rows={opname.rows} locations={locations} editing={opname.canManage} />

      {opname.canManage && <FinishPanel opnameId={opname.id} hasAtk={opname.rows.some((r) => r.type === "ATK")} hasBmn={opname.rows.some((r) => r.type === "BMN")} pending={pending} />}
    </div>
  );
}
