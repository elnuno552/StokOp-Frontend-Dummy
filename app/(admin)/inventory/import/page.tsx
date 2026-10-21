import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { link } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { canMutateInventory } from "@/lib/permissions";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Impor barang" };

export default async function ImportPage() {
  const user = await requirePageAuth();
  if (!canMutateInventory(user.role, "BMN") && !canMutateInventory(user.role, "ATK")) {
    return <Forbidden requirement="Impor barang hanya dapat dilakukan oleh Super Admin, Admin BMN, atau Admin ATK." />;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/inventory" className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke daftar inventaris
      </Link>
      <PageHeader title="Impor barang" description="Unggah file Excel atau CSV, periksa hasilnya, lalu konfirmasi. Tidak ada data yang tersimpan sebelum Anda mengonfirmasi." />
      <ImportWizard />
    </div>
  );
}
