import { Badge } from "@/components/ui/badge";
import { OperationsForbidden } from "@/components/ui/operations-forbidden";
import { canViewOperations } from "@/lib/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionDialog } from "@/components/ui/action-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { buttonDanger, buttonSecondary, panel } from "@/components/ui/styles";
import { requirePageAuth } from "@/lib/auth/page";
import { formatRupiahExact } from "@/lib/format";
import { PURCHASE_PLAN_STATUS_LABELS } from "@/lib/inventory/labels";
import { linePrice, lineTotal } from "@/lib/purchase/calc";
import { getPlan, listAtkOptions } from "@/lib/purchase/service";
import { closePlanAction, createItemsAction, statusAction } from "../actions";
import { PlanEditor, Totals } from "./plan-editor";
import { ReceiveDialog } from "./receive-dialog";

export const metadata: Metadata = { title: "Rencana pembelian" };

const STATUS_TONE = {
  DRAFT: "neutral",
  FINAL: "accent",
  PARTIAL: "warning",
  RECEIVED: "success",
  CANCELLED: "neutral",
} as const;

const typed = (n: number) => String(n).replace(".", ",");

export default async function PurchasePlanPage({ params }: PageProps<"/purchase-plans/[id]">) {
  const user = await requirePageAuth();
  if (!canViewOperations(user.role)) return <OperationsForbidden />;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const plan = await getPlan(user, id);
  if (!plan) notFound();

  const editable = plan.canManage && plan.status === "DRAFT";
  const atkOptions = editable ? await listAtkOptions(user) : [];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/purchase-plans" className="w-fit text-sm font-medium text-accent hover:underline">
        ← Rencana pembelian
      </Link>

      <PageHeader
        title={plan.title}
        description={
          <>
            <span className="font-mono">{plan.code}</span> · {plan.planDateLabel} · dibuat oleh {plan.createdByName}{" "}
            <Badge tone={STATUS_TONE[plan.status]} className="ml-1">{PURCHASE_PLAN_STATUS_LABELS[plan.status]}</Badge>
          </>
        }
        actions={
          <>
            <a href={`/api/purchase-plans/${plan.id}/export`} className={buttonSecondary}>
              Ekspor Excel
            </a>
            {plan.canManage && (plan.status === "DRAFT" || plan.status === "FINAL") && plan.lines.some((l) => !l.itemId) && (
              <ActionDialog
                triggerLabel={`Buat barang ATK (${plan.lines.filter((l) => !l.itemId).length})`}
                title="Buat barang ATK dari baris?"
                description="Setiap baris yang belum tertaut menjadi barang ATK baru dengan stok 0 dan satuan dari RAB, lalu ditautkan. Baris yang namanya sudah ada di Inventaris hanya ditautkan. Simpan perubahan editor terlebih dahulu."
                action={createItemsAction.bind(null, plan.id)}
                submitLabel="Buat dan tautkan"
                pendingLabel="Memproses…"
              />
            )}
            {plan.canManage && plan.status === "DRAFT" && (
              <ActionDialog
                triggerLabel="Finalkan"
                title="Finalkan rencana?"
                description="Setelah final, baris tidak dapat diubah. Semua baris harus punya harga satuan."
                action={statusAction.bind(null, plan.id, "FINALIZE")}
                submitLabel="Ya, finalkan"
                pendingLabel="Memproses…"
              />
            )}
            {plan.canManage && (plan.status === "FINAL" || plan.status === "PARTIAL") && <ReceiveDialog planId={plan.id} lines={plan.lines} partial={plan.status === "PARTIAL"} />}
            {plan.canManage && plan.status === "PARTIAL" && (
              <ActionDialog
                triggerLabel="Tutup RAB"
                title="Tutup rencana pembelian?"
                description={`${plan.lines.filter((l) => l.remaining > 0).length} baris belum lengkap dianggap tidak akan diterima. Stok tidak berubah dan RAB berstatus Diterima.`}
                action={closePlanAction.bind(null, plan.id)}
                submitLabel="Ya, tutup RAB"
                pendingLabel="Memproses…"
                tone="neutral"
              />
            )}
            {plan.canManage && plan.status === "FINAL" && (
              <ActionDialog
                triggerLabel="Buka kembali"
                title="Buka kembali sebagai draf?"
                description="Rencana dapat diubah lagi, lalu difinalkan ulang."
                action={statusAction.bind(null, plan.id, "REOPEN")}
                submitLabel="Ya, buka kembali"
                pendingLabel="Memproses…"
              />
            )}
            {plan.canManage && (plan.status === "DRAFT" || plan.status === "FINAL") && (
              <ActionDialog
                triggerLabel="Batalkan"
                triggerClassName={buttonDanger}
                title="Batalkan rencana pembelian?"
                description="Rencana tidak akan dipakai lagi. Stok tidak berubah."
                action={statusAction.bind(null, plan.id, "CANCEL")}
                submitLabel="Ya, batalkan"
                pendingLabel="Membatalkan…"
                tone="danger"
              />
            )}
          </>
        }
      />
      {plan.notes && <p className="text-sm text-muted">{plan.notes}</p>}

      {editable ? (
        <PlanEditor
          // A new key after saving loads the ids of freshly created lines from the server.
          key={plan.lines.map((l) => `${l.id}:${l.itemId ?? ""}`).join(",")}
          planId={plan.id}
          header={{
            title: plan.title,
            planDate: plan.planDate,
            pricePercent: typed(plan.pricePercent),
            ppnRate: typed(plan.ppnRate),
            rounding: plan.rounding === null ? "" : typed(plan.rounding),
            notes: plan.notes ?? "",
          }}
          lines={plan.lines}
          atkOptions={atkOptions}
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            Kenaikan harga {typed(plan.pricePercent)}% · PPN {typed(plan.ppnRate)}%
          </p>
          <div className={`${panel} relative overflow-x-auto`}>
            <table className="w-full min-w-[56rem] text-left text-[13px]">
              <caption className="sr-only">Baris rencana pembelian</caption>
              <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
                <tr>
                  {["No", "Uraian barang", "Volume", "Satuan", "Harga satuan", "Biaya pengiriman", "Harga", "Jumlah", "Gambar", "Link", ...(plan.status === "RECEIVED" || plan.status === "PARTIAL" ? ["Diterima"] : [])].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plan.lines.map((line) => (
                  <tr key={line.id} className="align-top">
                    <td className="px-3 py-2 tabular-nums text-muted">{line.lineNo}</td>
                    <td className="min-w-64 px-3 py-2 text-fg">
                      {line.description}
                      {line.itemLabel && <p className="text-xs text-muted">Stok: {line.itemLabel}</p>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{typed(line.volume)}</td>
                    <td className="px-3 py-2">{line.unit}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatRupiahExact(line.unitPrice)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatRupiahExact(line.shippingCost)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatRupiahExact(linePrice(line, plan.priceFactor))}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{formatRupiahExact(lineTotal(line, plan.priceFactor))}</td>
                    <td className="px-3 py-2">
                      {line.hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/purchase-plans/${plan.id}/lines/${line.id}/image`} alt={`Foto baris ${line.lineNo}`} className="size-12 rounded border border-border object-cover" />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="max-w-48 px-3 py-2">
                      {line.link ? (
                        <a href={line.link} target="_blank" rel="noopener noreferrer" className="block truncate text-accent hover:underline">
                          {line.link}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    {(plan.status === "RECEIVED" || plan.status === "PARTIAL") && (
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {line.receivedQuantity === null ? "—" : typed(line.receivedQuantity)}
                        {plan.status === "PARTIAL" && line.remaining > 0 && <span className="block text-xs font-semibold text-warning">sisa {typed(line.remaining)}</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plan.receipts.length > 0 && (
            <section aria-labelledby="riwayat-penerimaan" className={panel}>
              <h2 id="riwayat-penerimaan" className="border-b border-border px-4 py-3 text-base font-semibold text-fg">
                Riwayat penerimaan
              </h2>
              <ul className="divide-y divide-border text-sm">
                {plan.receipts.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <p className="font-medium text-fg">
                      Penerimaan ke-{r.receiptNo} · {r.receivedAtLabel}
                      {r.createdByName && <span className="font-normal text-muted"> · dicatat {r.createdByName}</span>}
                    </p>
                    {r.notes && <p className="text-muted">{r.notes}</p>}
                    <ul className="mt-1 grid gap-x-6 text-muted sm:grid-cols-2">
                      {r.lines.map((l) => (
                        <li key={l.id} className="truncate">
                          {l.lineNo}. {l.description}: <span className="tabular-nums text-fg">{typed(l.quantity)}</span> {l.unit}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Totals subtotal={plan.totals.subtotal} ppn={plan.totals.ppn} total={plan.totals.total} ppnRate={plan.ppnRate}>
            {plan.rounding !== null && (
              <div className="mt-2 flex justify-between gap-4 text-sm">
                <span className="font-semibold text-fg">PEMBULATAN</span>
                <span className="tabular-nums text-fg">{formatRupiahExact(plan.rounding)}</span>
              </div>
            )}
          </Totals>
        </>
      )}
    </div>
  );
}
