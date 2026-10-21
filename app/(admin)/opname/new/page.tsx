import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageAuth } from "@/lib/auth/page";
import { categories as categoryRows, items as itemRows, locations as locationRows } from "@/lib/mock/data";
import { canManageMaster } from "@/lib/master/service";
import { mutableTypes } from "@/lib/opname/service";
import { MasterFormDialog } from "../../master/master-dialogs";
import { NewOpnameForm } from "./new-opname-form";

export const metadata: Metadata = { title: "Mulai opname" };

export default async function NewOpnamePage() {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const types = mutableTypes(user);
  if (types.length === 0) return <Forbidden requirement="Stock opname hanya dapat dimulai oleh admin BMN, admin ATK, atau Super Admin." />;

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "id");
  const locations = [...locationRows].sort(byName).map((l) => ({ id: l.id, name: l.name }));
  const categories = categoryRows.filter((c) => c.type === "BMN").sort(byName).map((c) => ({ id: c.id, name: c.name }));
  const unplaced = itemRows.filter((i) => i.type === "BMN" && i.status !== "DISPOSED" && i.locationId === null).length;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link href="/opname" className="w-fit text-sm font-medium text-accent hover:underline">
        ← Stock opname
      </Link>
      <PageHeader title="Mulai stock opname" description="Sistem mencatat jumlah, lokasi, dan kondisi saat ini sebagai acuan hitung." />
      <NewOpnameForm locations={locations} types={types} categories={categories} canSurvey={types.includes("BMN")} unplaced={unplaced} />
      {canManageMaster(user, "locations") && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>Ruangan belum terdaftar?</span>
          <MasterFormDialog entity="locations" id={null} />
        </div>
      )}
    </div>
  );
}
