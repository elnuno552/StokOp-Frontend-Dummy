import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { link } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { canManagePlans } from "@/lib/purchase/service";
import { ImportPlan } from "./import-plan";

export const metadata: Metadata = { title: "Impor RAB" };

export default async function ImportPlanPage() {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  if (!canManagePlans(user)) return <Forbidden requirement="Rencana pembelian ATK hanya dapat dibuat oleh Super Admin atau Admin ATK." />;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/purchase-plans" className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke daftar
      </Link>
      <PageHeader
        title="Impor RAB dari Excel"
        description="Unggah file RAB (.xlsx) dengan kolom No, Uraian Barang, Volume, Satuan, Harga Satuan, Biaya Pengiriman, Harga, Jumlah, Gambar, dan Link. Hasilnya menjadi draf yang dapat Anda periksa dan ubah sebelum difinalkan."
      />
      <ImportPlan />
    </div>
  );
}
