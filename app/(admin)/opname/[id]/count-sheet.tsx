"use client";

import { Badge } from "@/components/ui/badge";
import { useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonDanger, buttonSecondary, input, panel } from "@/components/ui/styles";
import { ITEM_CONDITION_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/inventory/labels";
import type { OpnameRow } from "@/lib/opname/service";
import { cancelOpnameAction, completeOpnameAction, saveCountsAction, type OpnameFormState } from "../actions";

const cell = "px-3 py-2 align-top";
const small = "h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-fg disabled:bg-surface-sunken disabled:text-muted";

const STATUS_TONE = {
  MATCH: "success",
  MISMATCH: "warning",
  NOT_FOUND: "danger",
  NOT_VERIFIED: "neutral",
} as const;

function foundValue(row: OpnameRow) {
  if (row.verificationStatus === "NOT_FOUND") return "missing";
  if (row.verificationStatus === "MATCH" || row.verificationStatus === "MISMATCH") return "found";
  return "";
}

function Feedback({ state }: { state: OpnameFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-medium text-success">
        {state.message}
      </p>
    );
  }
  return null;
}

export function CountSheet({
  opnameId,
  rows,
  locations,
  editing,
}: {
  opnameId: string;
  rows: OpnameRow[];
  locations: { id: string; name: string }[];
  /** Session is in progress and the user may count at least some rows. */
  editing: boolean;
}) {
  const [saveState, saveAction] = useActionState<OpnameFormState, FormData>(saveCountsAction.bind(null, opnameId), {});
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  // Rows are hidden, not removed, so what was typed in a hidden row is still saved.
  const needle = query.trim().toLowerCase();
  const shown = (row: OpnameRow) =>
    (!onlyPending || row.verificationStatus === "NOT_VERIFIED") &&
    (needle === "" || `${row.code} ${row.name} ${row.systemLocationName ?? ""}`.toLowerCase().includes(needle));
  const visibleCount = rows.filter(shown).length;
  const hasBmn = rows.some((r) => r.type === "BMN" && r.editable);

  // Mark every shown, still-unanswered BMN row as found.
  function markShownFound() {
    const form = formRef.current;
    if (!form) return;
    for (const tr of form.querySelectorAll<HTMLTableRowElement>("tr[data-row]")) {
      if (tr.hidden) continue;
      const select = tr.querySelector<HTMLSelectElement>('select[name$=":found"]');
      if (select && !select.disabled && select.value === "") select.value = "found";
    }
  }

  return (
    <form ref={formRef} action={saveAction} key={saveState.attempt ?? "initial"} className="flex flex-col gap-3">
      <Feedback state={saveState} />
      {rows.length > 8 && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode, nama, atau lokasi…"
            aria-label="Cari di lembar hitung"
            className={`${input} max-w-xs`}
            // Searching must not submit the sheet.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
          <label className="flex min-h-9 items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} className="size-4 accent-accent" />
            Hanya yang belum diperiksa
          </label>
          {editing && hasBmn && (
            <button type="button" onClick={markShownFound} className={`${buttonSecondary} min-h-9 px-3`}>
              Tandai yang tampil ditemukan
            </button>
          )}
          <span className="text-sm tabular-nums text-muted" role="status">
            Menampilkan {visibleCount} dari {rows.length}
          </span>
        </div>
      )}
      <div className={`${panel} relative overflow-x-auto`}>
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">Lembar hitung stock opname</caption>
          <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
            <tr>
              <th scope="col" className={`${cell} font-semibold`}>
                Barang
              </th>
              <th scope="col" className={`${cell} font-semibold`}>
                Data sistem
              </th>
              <th scope="col" className={`${cell} font-semibold`}>
                Hasil pemeriksaan
              </th>
              <th scope="col" className={`${cell} font-semibold`}>
                Status
              </th>
              <th scope="col" className={`${cell} font-semibold`}>
                Catatan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const disabled = !editing || !row.editable;
              const verified = row.verificationStatus !== "NOT_VERIFIED";
              return (
                <tr key={row.id} data-row hidden={!shown(row)}>
                  <td className={`${cell} min-w-40`}>
                    <p className="font-mono text-xs text-muted">{row.code}</p>
                    <p className="font-medium text-fg">{row.name}</p>
                  </td>
                  <td className={`${cell} min-w-36 text-fg`}>
                    {row.type === "ATK" ? (
                      <p className="tabular-nums">
                        {row.systemQuantityLabel}
                        {row.unit ? ` ${row.unit}` : ""}
                      </p>
                    ) : (
                      <>
                        <p>{row.systemLocationName ?? "Tanpa lokasi"}</p>
                        <p className="text-xs text-muted">{row.systemCondition ? ITEM_CONDITION_LABELS[row.systemCondition] : "—"}</p>
                      </>
                    )}
                  </td>
                  <td className={`${cell} min-w-48`}>
                    {row.type === "ATK" ? (
                      <div>
                        <label className="sr-only" htmlFor={`qty-${row.id}`}>
                          Jumlah hasil hitung {row.name}
                        </label>
                        <input
                          id={`qty-${row.id}`}
                          name={`row:${row.id}:qty`}
                          inputMode="decimal"
                          autoComplete="off"
                          disabled={disabled}
                          defaultValue={verified ? String(row.actualQuantity).replace(".", ",") : ""}
                          placeholder="Jumlah"
                          className={small}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <select name={`row:${row.id}:found`} disabled={disabled} defaultValue={foundValue(row)} aria-label={`Pemeriksaan ${row.name}`} className={small}>
                          <option value="">Belum diperiksa</option>
                          <option value="found">Ditemukan</option>
                          <option value="missing">Tidak ditemukan</option>
                        </select>
                        <select
                          name={`row:${row.id}:condition`}
                          disabled={disabled}
                          defaultValue={row.actualCondition ?? row.systemCondition ?? "GOOD"}
                          aria-label={`Kondisi ${row.name}`}
                          className={small}
                        >
                          <option value="GOOD">{ITEM_CONDITION_LABELS.GOOD}</option>
                          <option value="MINOR_DAMAGE">{ITEM_CONDITION_LABELS.MINOR_DAMAGE}</option>
                          <option value="MAJOR_DAMAGE">{ITEM_CONDITION_LABELS.MAJOR_DAMAGE}</option>
                        </select>
                        <select
                          name={`row:${row.id}:location`}
                          disabled={disabled}
                          defaultValue={row.actualLocationId ?? row.systemLocationId ?? ""}
                          aria-label={`Lokasi ditemukan ${row.name}`}
                          className={small}
                        >
                          <option value="">Tanpa lokasi</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>
                    <Badge tone={STATUS_TONE[row.verificationStatus]}>
                      {VERIFICATION_STATUS_LABELS[row.verificationStatus]}
                    </Badge>
                    {verified && row.type === "ATK" && row.discrepancy !== 0 && (
                      <p className="mt-1 text-xs tabular-nums text-warning">
                        Selisih {row.discrepancy > 0 ? "+" : ""}
                        {row.discrepancyLabel}
                      </p>
                    )}
                  </td>
                  <td className={`${cell} min-w-40`}>
                    <input
                      name={`row:${row.id}:notes`}
                      disabled={disabled}
                      defaultValue={row.notes ?? ""}
                      maxLength={500}
                      aria-label={`Catatan ${row.name}`}
                      className={small}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <div>
          <SubmitButton pendingLabel="Menyimpan…">Simpan hasil hitung</SubmitButton>
        </div>
      )}
    </form>
  );
}

export function FinishPanel({ opnameId, hasAtk, hasBmn, pending }: { opnameId: string; hasAtk: boolean; hasBmn: boolean; pending: number }) {
  const [doneState, completeAction] = useActionState<OpnameFormState, FormData>(completeOpnameAction.bind(null, opnameId), {});
  const [cancelState, cancelAction] = useActionState<OpnameFormState, FormData>(() => cancelOpnameAction(opnameId), {});

  return (
    <section className={`${panel} flex flex-col gap-4 p-5`} aria-labelledby="finish-title">
      <h2 id="finish-title" className="text-base font-semibold text-fg">
        Selesaikan opname
      </h2>
      <Feedback state={doneState} />
      <Feedback state={cancelState} />
      <form action={completeAction} className="flex flex-col gap-3">
        {hasAtk && (
          <label className="flex items-start gap-2.5 text-sm text-fg">
            <input type="checkbox" name="applyAdjustments" defaultChecked className="mt-0.5 size-4 accent-accent" />
            <span>
              Sesuaikan stok ATK sesuai hasil hitung
              <span className="block text-muted">Setiap selisih menjadi transaksi penyesuaian dan tercatat di History Log. Selisih BMN hanya dilaporkan.</span>
            </span>
          </label>
        )}
        {hasBmn && (
          <label className="flex items-start gap-2.5 text-sm text-fg">
            <input type="checkbox" name="applyBmn" defaultChecked className="mt-0.5 size-4 accent-accent" />
            <span>
              Terapkan lokasi dan kondisi hasil pemeriksaan ke data BMN
              <span className="block text-muted">
                Aset yang ditemukan dipindahkan ke lokasi yang dicatat dan kondisinya diperbarui (tercatat sebagai transaksi dan di History Log). Aset yang sedang dipinjam atau diperbaiki dilewati. Aset yang tidak ditemukan hanya dilaporkan.
              </span>
            </span>
          </label>
        )}
        {pending > 0 && <p className="text-sm text-warning">Masih ada {pending} barang yang belum diperiksa.</p>}
        <div>
          <SubmitButton pendingLabel="Menyelesaikan…">Selesaikan opname</SubmitButton>
        </div>
      </form>
      <form action={cancelAction} className="border-t border-border pt-4">
        <SubmitButton pendingLabel="Membatalkan…" className={buttonDanger}>
          Batalkan sesi
        </SubmitButton>
        <p className="mt-2 text-sm text-muted">Membatalkan tidak mengubah stok atau data barang.</p>
      </form>
    </section>
  );
}
