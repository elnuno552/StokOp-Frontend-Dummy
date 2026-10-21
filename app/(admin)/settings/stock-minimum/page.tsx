import type { Metadata } from "next";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageCapability } from "@/lib/auth/page";
import { listMinimums } from "@/lib/stock-minimum/service";
import { SettingsNav } from "../settings-nav";
import { MinimumForm } from "./minimum-form";

export const metadata: Metadata = { title: "Stok minimum" };

export default async function StockMinimumPage() {
  const actor = await requirePageCapability("manage_settings");
  if (!actor) return <Forbidden requirement="Pengaturan hanya dapat diubah oleh peran yang diberi izin." />;

  const groups = await listMinimums(actor);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pengaturan" description="Stok minimum menentukan kapan ATK dianggap menipis dan tampil di Beranda. Isi per barang, atau isi bawaan per kategori." />
      <SettingsNav role={actor.role} current="/settings/stock-minimum" />
      <MinimumForm groups={groups} />
    </div>
  );
}
