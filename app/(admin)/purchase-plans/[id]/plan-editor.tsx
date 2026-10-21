"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { buttonPrimary, buttonSecondary, fieldError, input, label, panel } from "@/components/ui/styles";
import { formatRupiahExact } from "@/lib/format";
import { prepareImage } from "@/lib/image-prepare";
import { linePrice, lineTotal, percentToFactor, planTotals } from "@/lib/purchase/calc";
import { parseMoney, parseVolume } from "@/lib/purchase/parse";
import type { PlanLineView } from "@/lib/purchase/service";
import { savePlanAction, suggestLowStockAction, type SavePlanResult } from "../actions";

export interface AtkOption {
  id: string;
  label: string;
  name: string;
  unit: string;
}

interface Row {
  key: string;
  id?: string;
  itemId: string;
  description: string;
  volume: string;
  unit: string;
  unitPrice: string;
  shippingCost: string;
  link: string;
  hasImage: boolean;
  imageVersion: number;
}

interface HeaderState {
  title: string;
  planDate: string;
  pricePercent: string;
  ppnRate: string;
  rounding: string;
  notes: string;
}

const cell = "px-2 py-2 align-top";
const small = "block h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-fg placeholder:text-muted aria-invalid:border-danger";

let counter = 0;
const newKey = () => `row-${Date.now()}-${counter++}`;
const typed = (n: number) => String(n).replace(".", ",");

function toRow(line: PlanLineView): Row {
  return {
    key: line.id,
    id: line.id,
    itemId: line.itemId ?? "",
    description: line.description,
    volume: typed(line.volume),
    unit: line.unit,
    unitPrice: typed(line.unitPrice),
    shippingCost: typed(line.shippingCost),
    link: line.link ?? "",
    hasImage: line.hasImage,
    imageVersion: 0,
  };
}

const emptyRow = (): Row => ({
  key: newKey(),
  itemId: "",
  description: "",
  volume: "1",
  unit: "",
  unitPrice: "",
  shippingCost: "0",
  link: "",
  hasImage: false,
  imageVersion: 0,
});

/** Editable RAB (draft). Amounts update as you type, using the same formulas as the server and the Excel sheet. */
export function PlanEditor({
  planId,
  header: initialHeader,
  lines,
  atkOptions,
}: {
  planId: string;
  header: HeaderState;
  lines: PlanLineView[];
  atkOptions: AtkOption[];
}) {
  const router = useRouter();
  const [header, setHeader] = useState(initialHeader);
  const [rows, setRows] = useState<Row[]>(() => lines.map(toRow));
  const [result, setResult] = useState<SavePlanResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<string | null>(null);

  const percent = Number(header.pricePercent.replace(",", "."));
  const ppn = Number(header.ppnRate.replace(",", "."));
  const factor = Number.isFinite(percent) && percent >= 0 ? percentToFactor(percent) : 1;
  const ppnRate = Number.isFinite(ppn) && ppn >= 0 ? ppn : 0;

  const amounts = rows.map((row) => {
    const volume = parseVolume(row.volume);
    const price = parseMoney(row.unitPrice);
    const shipping = parseMoney(row.shippingCost === "" ? "0" : row.shippingCost);
    if (!volume.ok || !price.ok || !shipping.ok || volume.value <= 0) return null;
    const line = { volume: volume.value, unitPrice: price.value, shippingCost: shipping.value };
    return { line, price: linePrice(line, factor), total: lineTotal(line, factor) };
  });
  const totals = planTotals(
    amounts.flatMap((a) => (a ? [a.line] : [])),
    factor,
    ppnRate,
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setResult(null);
  }

  function pickItem(key: string, itemId: string) {
    const option = atkOptions.find((o) => o.id === itemId);
    setRows((current) =>
      current.map((r) =>
        r.key !== key
          ? r
          : {
              ...r,
              itemId,
              // Fill what is still empty from the chosen item; never overwrite typed text.
              description: r.description || option?.name || "",
              unit: r.unit || option?.unit || "",
            },
      ),
    );
    setResult(null);
  }

  async function suggest() {
    setBusy("suggest");
    setNotice(null);
    try {
      const drafts = await suggestLowStockAction(planId);
      const have = new Set(rows.map((r) => r.itemId).filter(Boolean));
      const fresh = drafts.filter((d) => !have.has(d.itemId));
      if (fresh.length === 0) {
        setNotice(drafts.length === 0 ? "Tidak ada ATK yang stoknya menipis." : "Semua ATK yang menipis sudah ada di daftar.");
        return;
      }
      setRows((current) => [
        ...current,
        ...fresh.map<Row>((d) => ({ ...emptyRow(), itemId: d.itemId, description: d.description, unit: d.unit, volume: d.volume })),
      ]);
      setNotice(`${fresh.length} barang ditambahkan. Isi harga satuan lalu simpan.`);
    } finally {
      setBusy(null);
    }
  }

  function save() {
    setNotice(null);
    startTransition(async () => {
      const payload = {
        header: {
          title: header.title,
          planDate: header.planDate,
          pricePercent: header.pricePercent,
          ppnRate: header.ppnRate,
          rounding: header.rounding,
          notes: header.notes,
        },
        lines: rows.map((r) => ({
          id: r.id ?? "",
          itemId: r.itemId,
          description: r.description,
          volume: r.volume,
          unit: r.unit,
          unitPrice: r.unitPrice,
          shippingCost: r.shippingCost,
          link: r.link,
        })),
      };
      const res = await savePlanAction(planId, JSON.stringify(payload));
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  async function sendImage(row: Row, file: File | null) {
    if (!row.id) return;
    setBusy(row.key);
    setNotice(null);
    try {
      const url = `/api/purchase-plans/${planId}/lines/${row.id}/image`;
      let upload = file;
      if (file) {
        const prepared = await prepareImage(file);
        if (!prepared.ok) {
          setNotice(prepared.error);
          return;
        }
        upload = prepared.file;
      }
      const response = upload
        ? await fetch(url, { method: "POST", body: (() => { const f = new FormData(); f.set("image", upload); return f; })() })
        : await fetch(url, { method: "DELETE" });
      if (response.status === 401) return router.push("/login");
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setNotice(body.error ?? (response.status === 413 ? "Foto terlalu besar untuk diunggah. Pilih foto yang lebih kecil." : "Foto tidak dapat diubah."));
        return;
      }
      update(row.key, { hasImage: Boolean(file), imageVersion: row.imageVersion + 1 });
    } finally {
      setBusy(null);
    }
  }

  const lineErrors = result?.lineErrors ?? {};
  const headerErrors = result?.headerErrors ?? {};

  return (
    <div className="flex flex-col gap-5">
      <section className={`${panel} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]`} aria-label="Data umum">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="pl-title" className={label}>
            Judul
          </label>
          <input id="pl-title" value={header.title} maxLength={255} onChange={(e) => setHeader({ ...header, title: e.target.value })} aria-invalid={headerErrors.title ? true : undefined} className={`${input} mt-1`} />
          {headerErrors.title && <p className={fieldError}>{headerErrors.title}</p>}
        </div>
        <div>
          <label htmlFor="pl-date" className={label}>
            Tanggal
          </label>
          <input id="pl-date" type="date" value={header.planDate} onChange={(e) => setHeader({ ...header, planDate: e.target.value })} aria-invalid={headerErrors.planDate ? true : undefined} className={`${input} mt-1`} />
          {headerErrors.planDate && <p className={fieldError}>{headerErrors.planDate}</p>}
        </div>
        <div>
          <label htmlFor="pl-percent" className={label}>
            Kenaikan harga (%)
          </label>
          <input id="pl-percent" value={header.pricePercent} inputMode="decimal" onChange={(e) => setHeader({ ...header, pricePercent: e.target.value })} aria-invalid={headerErrors.pricePercent ? true : undefined} className={`${input} mt-1`} />
          {headerErrors.pricePercent && <p className={fieldError}>{headerErrors.pricePercent}</p>}
        </div>
        <div>
          <label htmlFor="pl-ppn" className={label}>
            PPN (%)
          </label>
          <input id="pl-ppn" value={header.ppnRate} inputMode="decimal" onChange={(e) => setHeader({ ...header, ppnRate: e.target.value })} aria-invalid={headerErrors.ppnRate ? true : undefined} className={`${input} mt-1`} />
          {headerErrors.ppnRate && <p className={fieldError}>{headerErrors.ppnRate}</p>}
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="pl-notes" className={label}>
            Catatan (opsional)
          </label>
          <input id="pl-notes" value={header.notes} maxLength={500} onChange={(e) => setHeader({ ...header, notes: e.target.value })} className={`${input} mt-1`} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonSecondary} onClick={() => setRows((c) => [...c, emptyRow()])}>
          Tambah baris
        </button>
        <button type="button" className={buttonSecondary} onClick={suggest} disabled={busy === "suggest"}>
          {busy === "suggest" ? "Mencari…" : "Isi dari stok menipis"}
        </button>
        {notice && (
          <span role="status" className="text-sm text-muted">
            {notice}
          </span>
        )}
      </div>

      <div className={`${panel} relative overflow-x-auto`}>
        <table className="w-full min-w-[68rem] text-left text-[13px]">
          <caption className="sr-only">Baris rencana pembelian</caption>
          <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
            <tr>
              {["No", "Uraian barang", "Volume", "Satuan", "Harga satuan", "Biaya pengiriman", "Harga", "Jumlah", "Gambar", "Link", ""].map((h, i) => (
                <th key={i} scope="col" className={`${cell} whitespace-nowrap font-semibold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-5 py-10 text-center text-muted">
                  Belum ada baris. Pilih <b>Tambah baris</b> atau <b>Isi dari stok menipis</b>.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const amount = amounts[index];
              const errors = lineErrors[index];
              return (
                <tr key={row.key} className="align-top">
                  <td className={`${cell} tabular-nums text-muted`}>{index + 1}</td>
                  <td className={`${cell} min-w-64`}>
                    <label className="sr-only" htmlFor={`d-${row.key}`}>
                      Uraian barang baris {index + 1}
                    </label>
                    <textarea id={`d-${row.key}`} rows={2} value={row.description} maxLength={500} onChange={(e) => update(row.key, { description: e.target.value })} className={`${small} h-auto py-1.5`} />
                    <label className="sr-only" htmlFor={`i-${row.key}`}>
                      Tautkan ke barang ATK baris {index + 1}
                    </label>
                    <select id={`i-${row.key}`} value={row.itemId} onChange={(e) => pickItem(row.key, e.target.value)} className={`${small} mt-1 text-xs text-muted`}>
                      <option value="">Tidak ditautkan ke barang ATK</option>
                      {atkOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {errors && (
                      <ul className="mt-1 list-disc pl-4 text-xs font-medium text-danger" role="alert">
                        {errors.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={`${cell} w-24`}>
                    <input aria-label={`Volume baris ${index + 1}`} value={row.volume} inputMode="decimal" onChange={(e) => update(row.key, { volume: e.target.value })} className={`${small} text-right tabular-nums`} />
                  </td>
                  <td className={`${cell} w-24`}>
                    <input aria-label={`Satuan baris ${index + 1}`} value={row.unit} maxLength={50} onChange={(e) => update(row.key, { unit: e.target.value })} className={small} />
                  </td>
                  <td className={`${cell} w-32`}>
                    <MoneyInput bare aria-label={`Harga satuan baris ${index + 1}`} value={row.unitPrice} onValueChange={(unitPrice) => update(row.key, { unitPrice })} className={`${small} text-right`} />
                  </td>
                  <td className={`${cell} w-32`}>
                    <MoneyInput bare aria-label={`Biaya pengiriman baris ${index + 1}`} value={row.shippingCost} onValueChange={(shippingCost) => update(row.key, { shippingCost })} className={`${small} text-right`} />
                  </td>
                  <td className={`${cell} whitespace-nowrap text-right tabular-nums text-fg`}>{amount ? formatRupiahExact(amount.price) : "—"}</td>
                  <td className={`${cell} whitespace-nowrap text-right font-medium tabular-nums text-fg`}>{amount ? formatRupiahExact(amount.total) : "—"}</td>
                  <td className={`${cell} w-28`}>
                    {row.id ? (
                      <div className="flex flex-col items-start gap-1">
                        {row.hasImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/purchase-plans/${planId}/lines/${row.id}/image?v=${row.imageVersion}`} alt={`Foto baris ${index + 1}`} className="size-12 rounded border border-border object-cover" />
                        )}
                        <button
                          type="button"
                          className="text-xs font-medium text-accent hover:underline disabled:opacity-60"
                          disabled={busy === row.key}
                          onClick={() => {
                            uploadFor.current = row.key;
                            uploadRef.current?.click();
                          }}
                        >
                          {row.hasImage ? "Ganti" : "Tambah foto"}
                        </button>
                        {row.hasImage && (
                          <button type="button" className="text-xs font-medium text-danger hover:underline disabled:opacity-60" disabled={busy === row.key} onClick={() => sendImage(row, null)}>
                            Hapus foto
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Simpan dulu untuk menambah foto</span>
                    )}
                  </td>
                  <td className={`${cell} w-48`}>
                    <input aria-label={`Link baris ${index + 1}`} value={row.link} placeholder="https://…" onChange={(e) => update(row.key, { link: e.target.value })} className={small} />
                  </td>
                  <td className={cell}>
                    <button
                      type="button"
                      aria-label={`Hapus baris ${index + 1}`}
                      className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
                      onClick={() => {
                        setRows((c) => c.filter((r) => r.key !== row.key));
                        setResult(null);
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/heic"
        className="sr-only"
        aria-label="Pilih foto baris"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          const row = rows.find((r) => r.key === uploadFor.current);
          if (file && row) void sendImage(row, file);
        }}
      />

      <Totals subtotal={totals.subtotal} ppn={totals.ppn} total={totals.total} ppnRate={ppnRate}>
        <div className="mt-2 flex items-center justify-between gap-4">
          <label htmlFor="pl-round" className="text-sm font-semibold text-fg">
            PEMBULATAN
          </label>
          <MoneyInput bare id="pl-round" value={header.rounding} placeholder="opsional" onValueChange={(rounding) => setHeader({ ...header, rounding })} aria-invalid={headerErrors.rounding ? true : undefined} className={`${small} max-w-40 text-right`} />
        </div>
        {headerErrors.rounding && <p className={fieldError}>{headerErrors.rounding}</p>}
      </Totals>

      {result && !result.ok && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-medium text-success">
          Rencana pembelian disimpan.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonPrimary} onClick={save} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}

/** The four rows under the table, as in the sheet. */
export function Totals({
  subtotal,
  ppn,
  total,
  ppnRate,
  children,
}: {
  subtotal: number;
  ppn: number;
  total: number;
  ppnRate: number;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${panel} ml-auto w-full max-w-md p-4`} aria-label="Total">
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Jumlah</dt>
          <dd className="tabular-nums text-fg">{formatRupiahExact(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">PPN {ppnRate}%</dt>
          <dd className="tabular-nums text-fg">{formatRupiahExact(ppn)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-1.5">
          <dt className="font-semibold text-fg">JUMLAH TOTAL</dt>
          <dd className="text-base font-semibold tabular-nums text-fg">{formatRupiahExact(total)}</dd>
        </div>
      </dl>
      {children}
    </section>
  );
}
