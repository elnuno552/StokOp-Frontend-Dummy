"use client";

import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { buttonPrimary, hint, input, label } from "@/components/ui/styles";
import type { PlanLineView } from "@/lib/purchase/service";
import { receiveAction } from "../actions";

const typed = (n: number) => String(n).replace(".", ",");

/**
 * Booking in one delivery. Each line starts at what is still expected, so a full delivery is one click and a partial
 * one only needs the smaller numbers. Only lines tied to an ATK item change stock.
 */
export function ReceiveDialog({ planId, lines, partial }: { planId: string; lines: PlanLineView[]; partial: boolean }) {
  const open = lines.filter((l) => l.remaining > 0);
  const linked = open.filter((l) => l.itemId).length;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return (
    <ActionDialog
      triggerLabel={partial ? "Terima sisa barang" : "Terima barang"}
      triggerClassName={buttonPrimary}
      title={partial ? "Terima sisa barang" : "Terima barang"}
      description={`${open.length} baris belum lengkap; ${linked} tertaut ke barang ATK dan akan menambah stok. Kosongkan atau isi 0 untuk baris yang belum datang.`}
      action={receiveAction.bind(null, planId) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Simpan penerimaan"
      pendingLabel="Menyimpan…"
    >
      {() => (
        <>
          <div>
            <label htmlFor="rc-date" className={label}>
              Tanggal diterima
            </label>
            <input id="rc-date" name="receivedAt" type="date" defaultValue={today} max={today} className={`${input} mt-1 max-w-48`} />
          </div>
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {open.map((line) => (
              <div key={line.id}>
                <label htmlFor={`rc-${line.id}`} className="block text-sm font-medium text-fg">
                  {line.lineNo}. {line.description}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input id={`rc-${line.id}`} name={`received:${line.id}`} defaultValue={typed(line.remaining)} inputMode="decimal" className={`${input} max-w-32 text-right tabular-nums`} />
                  <span className="text-sm text-muted">
                    {line.unit} · sisa {typed(line.remaining)} dari {typed(line.volume)}
                  </span>
                </div>
                {line.itemId ? (
                  line.itemUnit && line.itemUnit.toLowerCase() !== line.unit.toLowerCase() ? (
                    <p className="mt-1 text-xs font-medium text-warning">
                      Satuan stok barang: {line.itemUnit}, satuan RAB: {line.unit}. Isi jumlah dalam satuan stok ({line.itemUnit}).
                    </p>
                  ) : (
                    <p className={hint}>Masuk ke stok {line.itemLabel}.</p>
                  )
                ) : (
                  <p className={hint}>Tidak tertaut ke barang ATK: hanya dicatat sebagai diterima.</p>
                )}
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="rc-notes" className={label}>
              Catatan (opsional)
            </label>
            <input id="rc-notes" name="notes" maxLength={500} placeholder="Contoh: pengiriman tahap 1, sisanya menyusul" className={`${input} mt-1`} />
          </div>
        </>
      )}
    </ActionDialog>
  );
}
