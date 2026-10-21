import type { Metadata } from "next";
import Link from "next/link";
import { ItemForm } from "@/components/inventory/item-form";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { link } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { getActiveFieldsByCategory } from "@/lib/custom-fields/service";
import { nextItemCode } from "@/lib/inventory/create";
import { categories as categoryRows, employees as employeeRows, locations as locationRows } from "@/lib/mock/data";
import { canMutateInventory } from "@/lib/permissions";

export const metadata: Metadata = { title: "Tambah barang" };

export default async function NewItemPage() {
  const user = await requirePageAuth();
  // Admin BMN may add BMN only, Admin ATK ATK only, Super Admin both. POST /api/items re-checks.
  const allowedTypes = (["BMN", "ATK"] as const).filter((type) => canMutateInventory(user.role, type));
  if (allowedTypes.length === 0) {
    return <Forbidden requirement="Menambah barang hanya dapat dilakukan oleh Super Admin, Admin BMN, atau Admin ATK." />;
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "id");
  const categories = [...categoryRows].sort(byName).map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const locations = [...locationRows].sort(byName).map((l) => ({ id: l.id, name: l.name }));
  const employees = employeeRows.filter((e) => e.isActive).sort(byName).map((e) => ({ id: e.id, name: e.name, unit: e.unit }));
  const [customFields, ...codes] = await Promise.all([getActiveFieldsByCategory(), ...allowedTypes.map((type) => nextItemCode(null, type))]);
  const codePreview = Object.fromEntries(allowedTypes.map((type, i) => [type, codes[i]])) as Partial<Record<ItemType, string>>;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/inventory" className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke daftar inventaris
      </Link>
      <PageHeader
        title="Tambah barang"
        description={
          allowedTypes.length === 2
            ? "Catat barang BMN (aset individual) atau ATK (barang habis pakai dengan stok)."
            : `Catat barang ${allowedTypes[0]} baru.`
        }
      />
      <ItemForm
        allowedTypes={allowedTypes}
        categories={categories}
        locations={locations}
        employees={employees.map((e) => ({ id: e.id, name: e.unit ? `${e.name} (${e.unit})` : e.name }))}
        codePreview={codePreview}
        customFields={customFields}
      />
    </div>
  );
}
