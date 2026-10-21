import { FlashToast } from "@/components/ui/toast";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { INVENTORY_COLUMNS_COOKIE, parseVisibleColumns } from "@/components/inventory/columns";
import Link from "next/link";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { PageHeader } from "@/components/ui/page-header";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { getInventoryFilterOptions, listItems } from "@/lib/inventory/list";
import { canMutateInventory } from "@/lib/permissions";
import { inventoryListQuerySchema, withCustomFilters } from "@/validations/inventory";

export const metadata: Metadata = { title: "Inventaris" };

// Every role may read all inventory (BMN and ATK); listItems re-checks this.
export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const user = await requirePageAuth();
  const params = await searchParams;
  const query = inventoryListQuerySchema.parse(withCustomFilters(params));
  const createdCode = typeof params.created === "string" ? params.created.slice(0, 100) : null;
  const deletedCode = typeof params.deleted === "string" ? params.deleted.slice(0, 100) : null;
  const importedCount = typeof params.imported === "string" && /^d{1,4}$/.test(params.imported) ? Number(params.imported) : null;
  const canCreate = canMutateInventory(user.role, "BMN") || canMutateInventory(user.role, "ATK");

  const [list, options, cookieStore] = await Promise.all([
    listItems(user, query),
    getInventoryFilterOptions(user),
    cookies(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventaris"
        description="Semua barang BMN dan ATK yang aktif. Barang yang sudah dihapus tidak ditampilkan."
        actions={
          canCreate ? (
            <>
            <Link href="/inventory/import" className={buttonSecondary}>
              Impor dari Excel
            </Link>
            <Link href="/inventory/new" className={buttonPrimary}>
              Tambah barang
            </Link>
            </>
          ) : undefined
        }
      />
      {importedCount !== null && <FlashToast message={`${importedCount} barang berhasil diimpor.`} params={["imported"]} />}
      {deletedCode && <FlashToast message={`Barang ${deletedCode} dihapus. Riwayatnya tetap tersimpan.`} params={["deleted"]} />}
      {createdCode && <FlashToast message={`Barang ${createdCode} berhasil ditambahkan.`} params={["created"]} />}
      <InventoryTable
        rows={list.rows}
        total={list.total}
        pageCount={list.pageCount}
        // Page is clamped to the last page by the server.
        query={{ ...query, page: list.page }}
        options={options}
        customColumns={list.customColumns}
        customFilters={list.customFilters}
        initialColumns={parseVisibleColumns(cookieStore.get(INVENTORY_COLUMNS_COOKIE)?.value)}
        mutableTypes={(["BMN", "ATK"] as const).filter((t) => canMutateInventory(user.role, t))}
      />
    </div>
  );
}
