"use client";

import { useState } from "react";
import { inventoryParams } from "@/lib/inventory/list-query";
import type { InventoryListQuery } from "@/validations/inventory";
import { DownloadIcon } from "./icons";
import { Popover } from "./popover";

const EXPORT_MAX_ROWS = 10_000;

const option = "flex min-h-9 cursor-pointer items-start gap-2.5 rounded px-1.5 py-1.5 hover:bg-surface-sunken";

/** "Ekspor data" form: format and scope (filtered result or selected rows). */
export function ExportMenu({
  query,
  total,
  selectedIds,
  buttonClassName,
}: {
  query: InventoryListQuery;
  total: number;
  selectedIds: string[];
  buttonClassName: string;
}) {
  const [format, setFormat] = useState<"xlsx" | "csv" | "aset">("xlsx");
  const [scope, setScope] = useState<"filtered" | "selected">("filtered");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveScope = scope === "selected" && selectedIds.length === 0 ? "filtered" : scope;
  const tooMany = effectiveScope === "filtered" && total > EXPORT_MAX_ROWS;
  const count = effectiveScope === "selected" ? selectedIds.length : total;

  async function download(close: () => void) {
    setBusy(true);
    setError(null);
    try {
      const params = inventoryParams(query);
      params.delete("pageSize");
      params.set("format", format === "csv" ? "csv" : "xlsx");
      if (format === "aset") params.set("layout", "aset");
      if (effectiveScope === "selected") params.set("ids", selectedIds.join(","));

      const response = await fetch(`/api/inventory/export?${params}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(response.status === 403 ? "Anda tidak memiliki akses untuk mengekspor data ini." : (body?.error ?? "Ekspor gagal. Coba lagi."));
        return;
      }
      const blob = await response.blob();
      const name =
        /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `inventaris.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      close();
    } catch {
      setError("Ekspor gagal. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover
      label="Ekspor data"
      title="Ekspor data"
      align="end"
      panelClassName="w-72"
      buttonClassName={buttonClassName}
      buttonContent={<DownloadIcon />}
    >
      {(close) => (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void download(close);
          }}
        >
          <p className="font-semibold">Ekspor data</p>

          <fieldset>
            <legend className="mb-1 text-xs font-medium text-muted">Format</legend>
            <label className={option}>
              <input type="radio" name="format" className="mt-0.5 size-4 accent-accent" checked={format === "xlsx"} onChange={() => setFormat("xlsx")} />
              <span>Excel (.xlsx)</span>
            </label>
            <label className={option}>
              <input type="radio" name="format" className="mt-0.5 size-4 accent-accent" checked={format === "csv"} onChange={() => setFormat("csv")} />
              <span>CSV (.csv)</span>
            </label>
            <label className={option}>
              <input type="radio" name="format" className="mt-0.5 size-4 accent-accent" checked={format === "aset"} onChange={() => setFormat("aset")} />
              <span>
                Excel format Daftar Aset
                <span className="block text-xs text-muted">Kolom dan urutan sama seperti file SIMAN. Hanya barang BMN.</span>
              </span>
            </label>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-xs font-medium text-muted">Data</legend>
            <label className={option}>
              <input type="radio" name="scope" className="mt-0.5 size-4 accent-accent" checked={effectiveScope === "filtered"} onChange={() => setScope("filtered")} />
              <span>
                Semua hasil filter
                <span className="block text-xs tabular-nums text-muted">{total.toLocaleString("id-ID")} barang, semua halaman</span>
              </span>
            </label>
            <label className={`${option} ${selectedIds.length === 0 ? "cursor-not-allowed opacity-50" : ""}`}>
              <input
                type="radio"
                name="scope"
                className="mt-0.5 size-4 accent-accent"
                checked={effectiveScope === "selected"}
                disabled={selectedIds.length === 0}
                onChange={() => setScope("selected")}
              />
              <span>
                Baris terpilih
                <span className="block text-xs tabular-nums text-muted">
                  {selectedIds.length === 0 ? "Belum ada baris dipilih" : `${selectedIds.length} barang`}
                </span>
              </span>
            </label>
          </fieldset>

          <p className="text-xs text-muted">Semua kolom data barang ikut diekspor. Ekspor dicatat di riwayat aktivitas.</p>
          {tooMany && (
            <p className="text-xs font-medium text-danger">
              Lebih dari {EXPORT_MAX_ROWS.toLocaleString("id-ID")} barang. Persempit filter terlebih dahulu.
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || tooMany || count === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DownloadIcon />
            {busy ? "Menyiapkan file…" : `Unduh ${count.toLocaleString("id-ID")} barang`}
          </button>
        </form>
      )}
    </Popover>
  );
}
