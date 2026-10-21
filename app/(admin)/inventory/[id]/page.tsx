import { RowActions } from "@/components/ui/row-actions";
import { MenuSeparator } from "@/components/ui/menu";
import { FlashToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/inventory/icons";
import { StatusBadge, TypeBadge } from "@/components/inventory/status-badge";
import { ActionDialog } from "@/components/ui/action-dialog";
import { buttonDanger, buttonSecondary, panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { decideBorrowStart } from "@/lib/borrowing/rules";
import { getItemDetail, getItemNeighbors, type ItemDetail } from "@/lib/inventory/detail";
import {
  BORROWING_STATUS_LABELS,
  ITEM_CONDITION_LABELS,
  MAINTENANCE_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/inventory/labels";
import { INVENTORY_PATH } from "@/lib/inventory/list-query";
import { canMutateInventory } from "@/lib/permissions";
import { inventoryListQuerySchema, withCustomFilters } from "@/validations/inventory";
import { getInventoryFilterOptions } from "@/lib/inventory/list";
import { deleteItemAction } from "./edit-actions";
import { ImageManager } from "./image-manager";
import { ItemActions } from "./item-actions";
import { NoteForm } from "./note-form";
import { CancelDisposalButton, CompleteDisposalButton, DecideDisposalDialog, MarkFoundDialog, MarkLostDialog, ProposeDisposalDialog } from "./disposal-dialogs";
import { DISPOSAL_REASON_LABELS, DISPOSAL_STATUS_LABELS, canDispose, canMarkLost } from "@/lib/disposal/rules";
import { BorrowDialog, MaintenanceOpDialog, ReportMaintenanceDialog, ReturnDialog } from "./workflow-dialogs";

export const metadata: Metadata = { title: "Detail barang" };

const TABS = [
  { key: "detail", label: "Detail" },
  { key: "riwayat", label: "Riwayat" },
  { key: "peminjaman", label: "Peminjaman", bmnOnly: true },
  { key: "perawatan", label: "Perawatan", bmnOnly: true },
  { key: "penghapusan", label: "Penghapusan", bmnOnly: true },
  { key: "gambar", label: "Gambar" },
  { key: "catatan", label: "Catatan" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ItemDetailPage({ params, searchParams }: PageProps<"/inventory/[id]">) {
  const user = await requirePageAuth();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const item = await getItemDetail(user, id);
  if (!item) notFound();
  const needsApproval = decideBorrowStart(user.role) === "PENDING";

  const sp = await searchParams;
  const visibleTabs = TABS.filter((t) => !("bmnOnly" in t) || item.type === "BMN");
  const requested = first(sp.tab);
  const tab: TabKey = visibleTabs.find((t) => t.key === requested)?.key ?? "detail";

  // "from" carries the list the user came from (its query string) so prev/next follow the same filters and sort.
  const from = first(sp.from);
  const listQuery = inventoryListQuerySchema.parse(withCustomFilters(Object.fromEntries(new URLSearchParams(from ?? ""))));
  const neighbors = from !== undefined ? await getItemNeighbors(user, id, listQuery) : null;
  const backHref = from ? `${INVENTORY_PATH}?${from}` : INVENTORY_PATH;

  const hrefFor = (target: string, nextTab?: TabKey) => {
    const qs = new URLSearchParams();
    if (nextTab && nextTab !== "detail") qs.set("tab", nextTab);
    if (from) qs.set("from", from);
    const s = qs.toString();
    return `${INVENTORY_PATH}/${target}${s ? `?${s}` : ""}`;
  };

  const canEdit = canMutateInventory(user.role, item.type);
  const options = canEdit ? await getInventoryFilterOptions(user) : null;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Navigasi barang" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href={backHref} className="font-medium text-accent hover:underline">
          ← Inventaris
        </Link>
        {neighbors && (
          <div className="flex items-center gap-1 text-muted">
            <span className="tabular-nums">
              {neighbors.position} dari {neighbors.total}
            </span>
            <PagerLink href={neighbors.prevId ? hrefFor(neighbors.prevId, tab) : null} label="Barang sebelumnya">
              <ChevronLeftIcon />
            </PagerLink>
            <PagerLink href={neighbors.nextId ? hrefFor(neighbors.nextId, tab) : null} label="Barang berikutnya">
              <ChevronRightIcon />
            </PagerLink>
          </div>
        )}
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={item.type} />
          <span className="font-mono text-sm text-muted">{item.code}</span>
        </div>
        <h1 className="text-2xl font-semibold text-fg">{item.name}</h1>
        <ul className="flex flex-wrap items-center gap-2 text-xs" aria-label="Ringkasan">
          <li className="rounded border border-border-strong px-2 py-1 font-semibold tabular-nums text-fg">
            Jumlah: {item.quantityLabel}
            {item.unit ? ` ${item.unit}` : ""}
          </li>
          <li>
            <StatusBadge status={item.status} />
          </li>
          <li className="rounded border border-border-strong px-2 py-1 text-fg">Kondisi: {ITEM_CONDITION_LABELS[item.condition]}</li>
          {item.lowStock && <li className="rounded bg-danger-soft px-2 py-1 font-semibold text-danger">Stok menipis, perlu diisi ulang</li>}
          {item.overdueBorrowing && <li className="rounded bg-warning-soft px-2 py-1 font-semibold text-warning">Peminjaman terlambat</li>}
          {item.openDisposal && <li className="rounded bg-warning-soft px-2 py-1 font-semibold text-warning">Diusulkan dihapuskan</li>}
        </ul>
        {options && item.status !== "DISPOSED" && (
          <ItemActions
            itemId={item.id}
            itemName={`${item.code} · ${item.name}`}
            type={item.type}
            quantityLabel={item.quantityLabel}
            unit={item.unit}
            options={options}
          />
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/inventory/${id}/edit`} className={buttonSecondary}>
              Ubah data
            </Link>
            <ActionDialog
              triggerLabel="Hapus barang"
              triggerClassName={buttonDanger}
              title="Hapus barang?"
              description={`${item.code} · ${item.name} akan disembunyikan dari daftar. Riwayatnya tetap tersimpan.`}
              action={deleteItemAction.bind(null, id)}
              submitLabel="Ya, hapus"
              pendingLabel="Menghapus…"
              tone="danger"
            />
          </div>
        )}
      </header>
      {(sp.notice === "updated" || sp.notice === "unchanged") && (
        <FlashToast
          message={sp.notice === "updated" ? "Barang berhasil diperbarui." : "Tidak ada perubahan yang perlu disimpan."}
          tone={sp.notice === "updated" ? "success" : "info"}
          params={["notice"]}
        />
      )}

      <nav aria-label="Bagian detail barang" className="overflow-x-auto border-b border-border">
        <ul className="flex min-w-max gap-1">
          {visibleTabs.map((t) => (
            <li key={t.key}>
              <Link
                href={hrefFor(id, t.key)}
                aria-current={t.key === tab ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
                  t.key === tab ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "detail" && <DetailTab item={item} />}
      {tab === "riwayat" && <HistoryTab item={item} />}
      {tab === "peminjaman" && <BorrowingTab item={item} canEdit={canEdit} employees={options?.pics ?? []} needsApproval={needsApproval} />}
      {tab === "perawatan" && <MaintenanceTab item={item} canEdit={canEdit} />}
      {tab === "penghapusan" && <DisposalTab item={item} canEdit={canEdit} />}
      {tab === "gambar" && <ImageManager itemId={item.id} itemName={item.name} images={item.images} canEdit={canEdit} />}
      {tab === "catatan" && (
        <section className="flex max-w-2xl flex-col gap-5">
          {canEdit ? (
            <NoteForm itemId={id} />
          ) : (
            <p className="text-sm text-muted">Anda hanya dapat melihat catatan barang {item.type}.</p>
          )}
          {item.notes.length === 0 ? (
            <Empty>Belum ada catatan.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {item.notes.map((n) => (
                <li key={n.id} className={`${panel} p-4`}>
                  <p className="whitespace-pre-wrap text-sm text-fg">{n.content}</p>
                  <p className="mt-2 text-xs text-muted">
                    {n.userName} · {n.createdAtLabel}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function PagerLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "inline-flex size-9 items-center justify-center rounded-md";
  return href ? (
    <Link href={href} aria-label={label} title={label} className={`${cls} text-fg hover:bg-surface-sunken`}>
      {children}
    </Link>
  ) : (
    <span aria-disabled="true" className={`${cls} opacity-40`}>
      {children}
    </span>
  );
}

function Empty({ children }: { children: string }) {
  return <EmptyState title={children.replace(/\.$/, "")} />;
}

function Fields({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <section className={panel}>
      <h2 className="border-b border-border px-4 py-2.5 text-sm font-semibold text-fg">{title}</h2>
      <dl className="divide-y divide-border text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2">
            <dt className="text-muted">{term}</dt>
            <dd className="min-w-0 break-words text-fg">{value ?? <span className="text-muted">—</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DetailTab({ item }: { item: ItemDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Fields
        title="Identitas"
        rows={[
          ["Kode", <span key="c" className="font-mono">{item.code}</span>],
          ["Kategori", item.categoryName],
          ["Merek", item.brand],
          ["Model", item.model],
          ["No. seri", item.serialNumber ? <span key="s" className="font-mono">{item.serialNumber}</span> : null],
          ["Deskripsi", item.description],
        ]}
      />
      {item.customFields.length > 0 && <Fields title="Data tambahan kategori" rows={item.customFields.map((f) => [f.archived ? `${f.label} (diarsipkan)` : f.label, f.display || null])} />}
      <Fields
        title="Penempatan"
        rows={[
          ["Lokasi", item.locationId && item.locationName ? <Link key="l" href={`/inventory?location=${item.locationId}`} className="text-accent hover:underline">{item.locationName}</Link> : null],
          ["Gedung / lantai / ruang", item.locationPath.length ? item.locationPath.join(" › ") : null],
          ["PIC", item.picName && item.picIsManual ? <span key="p">{item.picName} <span className="text-xs text-muted">(belum ada di Data master)</span></span> : item.picName],
          ["Unit PIC", item.picUnit],
        ]}
      />
      <Fields
        title={item.type === "ATK" ? "Stok" : "Perolehan"}
        rows={
          item.type === "ATK"
            ? [
                ["Jumlah", `${item.quantityLabel}${item.unit ? ` ${item.unit}` : ""}`],
                ["Stok minimum", item.minimumStockLabel],
                ["Tgl. perolehan", item.acquisitionDateLabel],
                ["Harga", item.acquisitionPriceLabel],
                ["Sumber dana", item.fundingSource],
              ]
            : [
                ["Tgl. perolehan", item.acquisitionDateLabel],
                ["Harga", item.acquisitionPriceLabel],
                ["Sumber dana", item.fundingSource],
              ]
        }
      />
      {item.type === "BMN" && item.register.hasData && (
        <Fields
          title="Data BMN (SIMAN)"
          rows={[
            ["Kode Satker", item.register.kodeSatker ? <span key="s" className="font-mono text-xs">{item.register.kodeSatker}</span> : null],
            ["Kode Barang", item.register.kodeBarang ? <span key="k" className="font-mono">{item.register.kodeBarang}</span> : null],
            ["NUP", item.register.nup],
            ["Kode Register", item.register.kodeRegister ? <span key="r" className="font-mono text-xs">{item.register.kodeRegister}</span> : null],
            ["Umur aset", item.register.umurAset === null ? null : `${item.register.umurAset} tahun`],
            ["Tanggal buku pertama", item.register.tanggalBukuPertamaLabel],
            ["Nilai perolehan pertama", item.register.nilaiPerolehanPertamaLabel],
            ["Nilai mutasi", item.register.nilaiMutasiLabel],
            ["Nilai perolehan", item.acquisitionPriceLabel],
            ["Nilai penyusutan", item.register.nilaiPenyusutanLabel],
            ["Nilai buku", item.register.nilaiBukuLabel],
            ["Status penggunaan", item.register.statusPenggunaan],
            ["No. PSP", item.register.noPsp],
            ["Tanggal PSP", item.register.tanggalPspLabel],
          ]}
        />
      )}
      <Fields
        title="Catatan sistem"
        rows={[
          ["Ditambahkan", item.createdAtLabel],
          ["Diperbarui", item.updatedAtLabel],
        ]}
      />
    </div>
  );
}

const th = "whitespace-nowrap px-3 py-2 font-semibold";
const td = "px-3 py-2 align-top";

function TableShell({ caption, head, children }: { caption: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className={`${panel} relative overflow-x-auto`}>
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

function HistoryTab({ item }: { item: ItemDetail }) {
  if (item.transactions.length === 0) return <Empty>Belum ada riwayat transaksi.</Empty>;
  return (
    <TableShell caption="Riwayat transaksi barang" head={["Waktu", "Jenis", "Jumlah", "Sebelum → sesudah", "Dari → ke", "Oleh", "Keterangan"]}>
      {item.transactions.map((t) => (
        <tr key={t.id}>
          <td className={`${td} whitespace-nowrap tabular-nums text-muted`}>{t.createdAtLabel}</td>
          <td className={`${td} whitespace-nowrap font-medium text-fg`}>{TRANSACTION_TYPE_LABELS[t.type]}</td>
          <td className={`${td} whitespace-nowrap tabular-nums`}>{t.quantityLabel}</td>
          <td className={`${td} whitespace-nowrap tabular-nums`}>
            {t.beforeLabel} → {t.afterLabel}
          </td>
          <td className={td}>{t.from || t.to ? `${t.from ?? "—"} → ${t.to ?? "—"}` : "—"}</td>
          <td className={td}>{t.userName}</td>
          <td className={`${td} min-w-40 text-muted`}>{t.description ?? "—"}</td>
        </tr>
      ))}
    </TableShell>
  );
}

function BorrowingTab({ item, canEdit, employees, needsApproval }: { item: ItemDetail; canEdit: boolean; employees: { id: string; name: string }[]; needsApproval: boolean }) {
  const canLend = canEdit && item.status === "AVAILABLE" && !item.hasPendingBorrowing;
  return (
    <div className="flex flex-col gap-4">
      {canLend && (
        <div>
          <BorrowDialog itemId={item.id} itemName={`${item.code} · ${item.name}`} employees={employees} needsApproval={needsApproval} />
        </div>
      )}
      {item.hasPendingBorrowing && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm font-medium text-warning">Ada permintaan peminjaman yang menunggu persetujuan. Lihat di menu Peminjaman.</p>}
      {item.borrowings.length === 0 ? (
        <Empty>Barang ini belum pernah dipinjam.</Empty>
      ) : (
        <TableShell caption="Riwayat peminjaman barang" head={["Peminjam", "Dipinjam", "Batas kembali", "Dikembalikan", "Status", "Catatan", "Aksi"]}>
          {item.borrowings.map((b) => (
            <tr key={b.id}>
              <td className={`${td} font-medium text-fg`}>
                {b.borrowerName}
                {b.basisDocument && <div className="text-xs font-normal text-muted">{b.basisDocument}</div>}
              </td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{b.borrowedAtLabel}</td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{b.expectedReturnLabel ?? "—"}</td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{b.returnedLabel ?? "—"}</td>
              <td className={`${td} whitespace-nowrap font-medium ${b.overdue ? "text-warning" : "text-fg"}`}>
                {b.overdue && b.status === "BORROWED" ? "Terlambat" : BORROWING_STATUS_LABELS[b.status]}
              </td>
              <td className={`${td} text-muted`}>
                {b.rejectedReason ? `Ditolak: ${b.rejectedReason}` : (b.notes ?? "—")}
              </td>
              <td className={td}>
                {canEdit && (b.status === "BORROWED" || b.status === "OVERDUE") && (
                  <ReturnDialog itemId={item.id} borrowingId={b.id} borrowerName={b.borrowerName} />
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

const DISPOSAL_TONE = {
  PROPOSED: "warning",
  APPROVED: "accent",
  REJECTED: "danger",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
} as const;

// Hilang and penghapusan: report an asset lost (reversible), or take it off the register in three steps
// (usulan -> keputusan/SK -> dihapuskan).
function DisposalTab({ item, canEdit }: { item: ItemDetail; canEdit: boolean }) {
  const label = `${item.code} · ${item.name}`;
  const canPropose = canEdit && canDispose(item.status) && !item.openDisposal && !item.hasPendingBorrowing;
  return (
    <div className="flex flex-col gap-4">
      {canEdit && item.status !== "DISPOSED" && (
        <div className="flex flex-wrap gap-2">
          {canMarkLost(item.status) && !item.hasPendingBorrowing && <MarkLostDialog itemId={item.id} itemName={label} />}
          {item.status === "LOST" && !item.openDisposal && <MarkFoundDialog itemId={item.id} itemName={label} />}
          {canPropose && <ProposeDisposalDialog itemId={item.id} itemName={label} defaultReason={item.status === "LOST" ? "LOST" : undefined} />}
        </div>
      )}
      {item.status === "BORROWED" || item.status === "UNDER_MAINTENANCE" ? (
        <p className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-fg-secondary">
          Barang sedang {item.status === "BORROWED" ? "dipinjam" : "dalam perawatan"}. Selesaikan dahulu sebelum menandai hilang atau mengusulkan penghapusan.
        </p>
      ) : null}
      {item.disposals.length === 0 ? (
        <Empty>Belum ada usulan penghapusan.</Empty>
      ) : (
        <TableShell caption="Riwayat usulan penghapusan" head={["Usulan", "Alasan", "Keputusan (SK)", "Status", "Aksi"]}>
          {item.disposals.map((d) => (
            <tr key={d.id}>
              <td className={`${td} whitespace-nowrap`}>
                <div className="font-medium text-fg">{d.proposalNumber ?? "Tanpa nomor"}</div>
                <div className="text-xs text-muted">{d.proposalDateLabel ?? d.createdLabel}</div>
              </td>
              <td className={`${td} min-w-48`}>
                <div className="font-medium text-fg">{DISPOSAL_REASON_LABELS[d.reasonType]}</div>
                <div className="whitespace-pre-line text-muted">{d.reason}</div>
              </td>
              <td className={`${td} min-w-40 text-muted`}>
                {d.decisionNumber ? (
                  <>
                    <div className="text-fg">{d.decisionNumber}</div>
                    <div className="text-xs">{d.decisionDateLabel}</div>
                  </>
                ) : (
                  "—"
                )}
                {d.decisionNotes && <div className="mt-1 whitespace-pre-line">{d.decisionNotes}</div>}
                {d.completedLabel && <div className="mt-1 text-xs">Dihapuskan {d.completedLabel}</div>}
              </td>
              <td className={td}>
                <Badge tone={DISPOSAL_TONE[d.status]}>{DISPOSAL_STATUS_LABELS[d.status]}</Badge>
              </td>
              <td className={td}>
                {canEdit && (d.status === "PROPOSED" || d.status === "APPROVED") && (
                  <RowActions label={`usulan ${d.proposalNumber ?? d.createdLabel}`}>
                    {d.status === "PROPOSED" && <DecideDisposalDialog itemId={item.id} disposalId={d.id} itemName={label} asMenuItem />}
                    <CancelDisposalButton itemId={item.id} disposalId={d.id} itemName={label} asMenuItem />
                    {d.status === "APPROVED" && (
                      <>
                        <MenuSeparator />
                        <CompleteDisposalButton itemId={item.id} disposalId={d.id} itemName={label} asMenuItem />
                      </>
                    )}
                  </RowActions>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

function MaintenanceTab({ item, canEdit }: { item: ItemDetail; canEdit: boolean }) {
  const canReport = canEdit && (item.status === "AVAILABLE" || item.status === "IN_USE");
  return (
    <div className="flex flex-col gap-4">
      {canReport && (
        <div>
          <ReportMaintenanceDialog itemId={item.id} itemName={`${item.code} · ${item.name}`} />
        </div>
      )}
      {item.maintenance.length === 0 ? (
        <Empty>Belum ada catatan perawatan.</Empty>
      ) : (
        <TableShell caption="Riwayat perawatan barang" head={["Dilaporkan", "Masalah", "Tindakan", "Pelaksana", "Biaya", "Selesai", "Status", "Aksi"]}>
          {item.maintenance.map((m) => {
            const open = m.status === "REPORTED" || m.status === "IN_PROGRESS";
            return (
              <tr key={m.id}>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{m.createdAtLabel}</td>
                <td className={`${td} min-w-40 text-fg`}>{m.problem}</td>
                <td className={`${td} min-w-32 text-muted`}>{m.actionTaken ?? "—"}</td>
                <td className={td}>
                  <div className="font-medium text-fg">{m.executorType === "VENDOR" ? `Vendor: ${m.vendorName ?? "—"}` : "Internal"}</div>
                  {m.technician && <div className="text-xs text-muted">{m.technician}</div>}
                </td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{m.costLabel ?? "—"}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{m.completedLabel ?? "—"}</td>
                <td className={`${td} whitespace-nowrap font-medium text-fg`}>{MAINTENANCE_STATUS_LABELS[m.status]}</td>
                <td className={td}>
                  {canEdit && open && (
                    <RowActions label={`perawatan ${m.createdAtLabel}`}>
                      {m.status === "REPORTED" && <MaintenanceOpDialog itemId={item.id} recordId={m.id} op="start" asMenuItem />}
                      <MaintenanceOpDialog itemId={item.id} recordId={m.id} op="complete" executorType={m.executorType} vendorName={m.vendorName} asMenuItem />
                      <MenuSeparator />
                      <MaintenanceOpDialog itemId={item.id} recordId={m.id} op="cancel" asMenuItem />
                    </RowActions>
                  )}
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </div>
  );
}
