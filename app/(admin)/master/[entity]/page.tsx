import { RowActions } from "@/components/ui/row-actions";
import { MenuSeparator } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { canManageMaster, listMaster } from "@/lib/master/service";
import { canMutateInventory } from "@/lib/permissions";
import { MASTER_ENTITIES, MASTER_LABELS, isMasterEntity, type MasterEntity } from "@/validations/master";
import { MasterDeleteDialog, MasterFormDialog } from "../master-dialogs";

export const metadata: Metadata = { title: "Data master" };

const HEADS: Record<MasterEntity, string[]> = {
  locations: ["Nama", "Gedung / lantai / ruang", "Barang"],
  categories: ["Nama", "Tipe", "Barang"],
  employees: ["Nama", "NIP", "Golongan", "Jabatan", "Lokasi", "Status"],
};

export default async function MasterPage({ params }: PageProps<"/master/[entity]">) {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const { entity } = await params;
  if (!isMasterEntity(entity)) notFound();

  if (!canManageMaster(user, entity) && !canManageMaster(user, "locations")) {
    return <Forbidden requirement="Data master hanya dapat dikelola oleh admin." />;
  }
  const rows = await listMaster(user, entity);
  const categoryTypes = (["BMN", "ATK"] as const).filter((t) => canMutateInventory(user.role, t));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data master"
        description="Lokasi, kategori, dan pegawai yang dipakai di seluruh sistem."
        actions={<MasterFormDialog entity={entity} id={null} allowedTypes={categoryTypes} />}
      />

      <nav aria-label="Jenis data master" className="border-b border-border">
        <ul className="flex gap-1">
          {MASTER_ENTITIES.map((e) => (
            <li key={e}>
              <Link
                href={`/master/${e}`}
                aria-current={e === entity ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
                  e === entity ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {MASTER_LABELS[e].plural}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada data" description="Gunakan tombol tambah di atas untuk menambahkan data pertama." />
      ) : (
        <div className={`${panel} relative overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Daftar {MASTER_LABELS[entity].plural}</caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                {[...HEADS[entity], "Aksi"].map((h) => (
                  <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${h === "Aksi" ? "text-right" : ""}`}>
                    {h === "Aksi" ? <span className="sr-only">Aksi</span> : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const manageable = canManageMaster(user, entity, row.type ?? undefined);
                return (
                  <tr key={row.id} className="align-middle">
                    {row.cells.map((cell, i) => (
                      <td key={i} className={`px-3 py-2 ${i === 0 ? "font-medium text-fg" : "text-fg"}`}>
                        {cell}
                        {entity === "employees" && i === 3 && row.values.unit && <span className="block text-xs text-muted">Unit {row.values.unit}</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {manageable && (
                        <RowActions label={row.cells[0]}>
                          <MasterFormDialog entity={entity} id={row.id} values={row.values} allowedTypes={categoryTypes} asMenuItem />
                          <MenuSeparator />
                          <MasterDeleteDialog entity={entity} id={row.id} name={row.cells[0]} asMenuItem />
                        </RowActions>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
