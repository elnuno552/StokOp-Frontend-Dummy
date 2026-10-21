import { Badge } from "@/components/ui/badge";
import { MenuSeparator } from "@/components/ui/menu";
import { RowActions } from "@/components/ui/row-actions";
import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { panel } from "@/components/ui/styles";
import { requirePageCapability } from "@/lib/auth/page";
import { FIELD_TYPE_LABELS } from "@/lib/custom-fields/rules";
import { listAllFields } from "@/lib/custom-fields/service";
import { SettingsNav } from "../settings-nav";
import { ArchiveFieldButton, DeleteFieldButton, FieldFormDialog, MoveButtons } from "./field-dialogs";

export const metadata: Metadata = { title: "Kolom kustom" };

export default async function CustomFieldsPage({ searchParams }: PageProps<"/settings/custom-fields">) {
  const actor = await requirePageCapability("manage_settings");
  if (!actor) return <Forbidden requirement="Pengaturan hanya dapat diubah oleh peran yang diberi izin." />;

  const categories = await listAllFields(actor);
  const requested = (await searchParams).category;
  const selected = categories.find((c) => c.categoryId === (Array.isArray(requested) ? requested[0] : requested)) ?? categories[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Tambahkan kolom isian khusus pada sebuah kategori, misalnya Nomor polisi untuk kendaraan. Kolom tampil di formulir barang, detail, daftar, filter, dan ekspor."
      />
      <SettingsNav role={actor.role} current="/settings/custom-fields" />

      {categories.length === 0 ? (
        <EmptyState title="Belum ada kategori" description="Kolom kustom dipasang pada kategori. Buat kategori di Data master dahulu." />
      ) : (
        <>
          <nav aria-label="Pilih kategori" className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Link
                key={c.categoryId}
                href={`/settings/custom-fields?category=${c.categoryId}`}
                aria-current={c.categoryId === selected.categoryId ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-150 ${
                  c.categoryId === selected.categoryId ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border-strong bg-surface text-fg hover:bg-surface-sunken"
                }`}
              >
                {c.categoryName}
                <span className="text-xs text-muted">
                  {c.type} · {c.fields.filter((f) => !f.archived).length}
                </span>
              </Link>
            ))}
          </nav>

          <section className={`${panel} max-w-4xl`} aria-label={`Kolom ${selected.categoryName}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-fg">{selected.categoryName}</h2>
              <FieldFormDialog categoryId={selected.categoryId} />
            </div>
            {selected.fields.length === 0 ? (
              <EmptyState bare title="Belum ada kolom kustom" description="Tambahkan kolom isian khusus untuk kategori ini dengan tombol Tambah kolom." />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {selected.fields.map((f, i) => (
                  <li key={f.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${f.archived ? "opacity-60" : ""}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-fg">
                        {f.label}
                        {f.archived && (
                          <Badge tone="neutral" className="ml-2">
                            Diarsipkan
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {FIELD_TYPE_LABELS[f.type]}
                        {f.type === "SELECT" ? ` (${f.options.join(", ")})` : ""}
                        {f.required ? " · wajib" : ""}
                        {f.showInList ? " · kolom daftar" : ""}
                        {f.filterable ? " · filter" : ""} · diisi pada {f.usedBy} barang
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!f.archived && <MoveButtons id={f.id} first={i === 0} last={i === selected.fields.length - 1} />}
                      <RowActions label={f.label}>
                        <FieldFormDialog categoryId={selected.categoryId} field={f} asMenuItem />
                        <ArchiveFieldButton field={f} asMenuItem />
                        {f.usedBy === 0 && (
                          <>
                            <MenuSeparator />
                            <DeleteFieldButton field={f} asMenuItem />
                          </>
                        )}
                      </RowActions>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
