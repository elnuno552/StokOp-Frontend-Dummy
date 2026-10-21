import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { link } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { todayInAppZone } from "@/lib/format";
import { canManagePlans } from "@/lib/purchase/service";
import { NewPlanForm } from "./new-plan-form";

export const metadata: Metadata = { title: "Buat RAB" };

export default async function NewPlanPage() {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  if (!canManagePlans(user)) return <Forbidden requirement="Rencana pembelian ATK hanya dapat dibuat oleh Super Admin atau Admin ATK." />;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link href="/purchase-plans" className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke daftar
      </Link>
      <PageHeader title="Buat rencana pembelian" description="Isi data umum dulu. Baris barang ditambahkan di halaman berikutnya." />
      <NewPlanForm today={todayInAppZone()} />
    </div>
  );
}
