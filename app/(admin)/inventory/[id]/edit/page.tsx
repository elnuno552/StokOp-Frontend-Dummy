import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { link } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { customFormValue } from "@/lib/custom-fields/rules";
import { getActiveFieldsByCategory } from "@/lib/custom-fields/service";
import { categories as categoryRows, itemById } from "@/lib/mock/data";
import { canMutateInventory } from "@/lib/permissions";
import { EditForm } from "./edit-form";

export const metadata: Metadata = { title: "Ubah barang" };

export default async function EditItemPage({ params }: PageProps<"/inventory/[id]/edit">) {
  const user = await requirePageAuth();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const item = itemById(id);
  if (!item) notFound();
  if (!canMutateInventory(user.role, item.type)) {
    return <Forbidden requirement={`Mengubah barang ${item.type} hanya dapat dilakukan oleh Super Admin atau Admin ${item.type}.`} />;
  }

  const customFields = await getActiveFieldsByCategory();
  const stored = (item.customValues ?? {}) as Record<string, unknown>;
  const customValues: Record<string, string> = {};
  for (const defs of Object.values(customFields)) for (const d of defs) customValues[d.id] = customFormValue(d, stored[d.id]);

  const categories = categoryRows
    .filter((c) => c.type === item.type)
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href={`/inventory/${id}`} className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke detail barang
      </Link>
      <PageHeader
        title={`Ubah ${item.code}`}
        description="Jumlah, status, lokasi, dan PIC diubah lewat aksi stok atau pemindahan di halaman detail agar tercatat di riwayat."
      />
      <EditForm
        itemId={id}
        type={item.type}
        categories={categories}
        customFields={customFields}
        customValues={customValues}
        defaults={{
          name: item.name,
          categoryId: item.categoryId ?? "",
          brand: item.brand ?? "",
          model: item.model ?? "",
          description: item.description ?? "",
          serialNumber: item.serialNumber ?? "",
          condition: item.condition === "LOST" ? "" : item.condition,
          acquisitionDate: item.acquisitionDate ? item.acquisitionDate.toISOString().slice(0, 10) : "",
          acquisitionPrice: item.acquisitionPrice ? String(item.acquisitionPrice) : "",
          fundingSource: item.fundingSource ?? "",
          unit: item.unit ?? "",
          minimumStock: item.minimumStock ? String(item.minimumStock) : "",
          kodeSatker: item.kodeSatker ?? "",
          kodeBarang: item.kodeBarang ?? "",
          nup: item.nup === null ? "" : String(item.nup),
          kodeRegister: item.kodeRegister ?? "",
          umurAset: item.umurAset === null ? "" : String(item.umurAset),
          tanggalBukuPertama: item.tanggalBukuPertama ? item.tanggalBukuPertama.toISOString().slice(0, 10) : "",
          nilaiPerolehanPertama: item.nilaiPerolehanPertama === null ? "" : String(item.nilaiPerolehanPertama),
          nilaiMutasi: item.nilaiMutasi === null ? "" : String(item.nilaiMutasi),
          nilaiPenyusutan: item.nilaiPenyusutan === null ? "" : String(item.nilaiPenyusutan),
          nilaiBuku: item.nilaiBuku === null ? "" : String(item.nilaiBuku),
          statusPenggunaan: item.statusPenggunaan ?? "",
          noPsp: item.noPsp ?? "",
          tanggalPsp: item.tanggalPsp ? item.tanggalPsp.toISOString().slice(0, 10) : "",
        }}
      />
    </div>
  );
}
