"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonPrimary, buttonSecondary, panel } from "@/components/ui/styles";

interface GenericRow {
  rowNumber: number;
  errors: string[];
  type: string;
  name: string;
  code: string | null;
}

type SimanStatus = "NEW" | "UPDATE" | "UNCHANGED" | "ERROR";

interface SimanRow {
  rowNumber: number;
  status: SimanStatus;
  kodeBarang: string;
  nup: string;
  name: string;
  changes: string[];
  errors: string[];
}

type Preview =
  | { layout: "generic"; rows: GenericRow[]; records: Record<string, string>[]; validCount: number; errorCount: number; ignoredColumns: string[] }
  | {
      layout: "siman";
      rows: SimanRow[];
      records: Record<string, string>[];
      counts: Record<SimanStatus, number>;
      newCategories: string[];
    };

const STATUS_LABEL: Record<SimanStatus, string> = {
  NEW: "Baru",
  UPDATE: "Diperbarui",
  UNCHANGED: "Tanpa perubahan",
  ERROR: "Bermasalah",
};

const STATUS_TONE: Record<SimanStatus, string> = {
  NEW: "text-success",
  UPDATE: "text-accent",
  UNCHANGED: "text-muted",
  ERROR: "text-danger",
};

const SHOWN_ROWS = 200;

export function ImportWizard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [tab, setTab] = useState<SimanStatus | "ALL">("ALL");

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/inventory/import/preview", { method: "POST", body });
      if (response.status === 401) return router.push("/login");
      const data = (await response.json().catch(() => ({}))) as Partial<Preview> & { error?: string };
      if (!response.ok) return setError(data.error ?? "File tidak dapat diproses.");
      const next = data as Preview;
      setPreview(next);
      if (next.layout === "siman") {
        // Land on what needs attention first.
        setTab(next.counts.ERROR > 0 ? "ERROR" : next.counts.UPDATE > 0 ? "UPDATE" : "ALL");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/inventory/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: preview.layout, records: preview.records }),
      });
      if (response.status === 401) return router.push("/login");
      const data = (await response.json().catch(() => ({}))) as { count?: number; error?: string };
      if (response.status === 201) {
        router.push(`/inventory?imported=${data.count ?? 0}`);
        return;
      }
      setError(data.error ?? "Impor dibatalkan. Perbaiki baris yang bermasalah lalu unggah ulang.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const canConfirm =
    preview !== null &&
    !busy &&
    (preview.layout === "siman" ? preview.counts.ERROR === 0 && preview.counts.NEW + preview.counts.UPDATE > 0 : preview.errorCount === 0);

  const confirmLabel = !preview
    ? ""
    : busy
      ? "Mengimpor…"
      : preview.layout === "siman"
        ? `Impor ${preview.counts.NEW} baru dan perbarui ${preview.counts.UPDATE}`
        : `Impor ${preview.rows.length} barang`;

  return (
    <div className="flex flex-col gap-6">
      <section className={`${panel} flex flex-col gap-3 p-5`} aria-labelledby="step1">
        <h2 id="step1" className="text-base font-semibold text-fg">
          1. Unggah file
        </h2>
        <p className="text-sm text-muted">
          Bisa memakai file <b>Daftar Aset</b> (ekspor SIMAN dengan kolom Kode Barang, NUP, Nilai Buku, dan seterusnya) atau template kami. Format .xlsx atau .csv, maksimal 2000 baris dan 5 MB.
          Untuk Daftar Aset, aset yang sudah ada diperbarui dan yang belum ada ditambahkan; lokasi dan PIC tidak ditimpa.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/inventory/import/template" className={buttonSecondary}>
            Unduh template
          </a>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="sr-only" id="import-file" onChange={onFile} disabled={busy} />
          <button type="button" className={buttonPrimary} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy && !preview ? "Memeriksa…" : "Pilih file"}
          </button>
          {fileName && <span className="text-sm text-muted">{fileName}</span>}
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {preview?.layout === "generic" && (
        <section className={`${panel} flex flex-col gap-4 p-5`} aria-labelledby="step2">
          <h2 id="step2" className="text-base font-semibold text-fg">
            2. Periksa hasil
          </h2>
          <p className="text-sm" role="status">
            <span className="font-semibold tabular-nums text-fg">{preview.rows.length}</span> baris dibaca ·{" "}
            <span className="font-semibold tabular-nums text-success">{preview.validCount} valid</span> ·{" "}
            <span className={`font-semibold tabular-nums ${preview.errorCount ? "text-danger" : "text-fg"}`}>{preview.errorCount} bermasalah</span>
          </p>
          {preview.ignoredColumns.length > 0 && (
            <p className="rounded-md border border-info-border bg-info-soft px-3 py-2 text-sm text-info">
              Kolom ini tidak cocok dengan kolom mana pun dan diabaikan: <b>{preview.ignoredColumns.join(", ")}</b>. Untuk kolom kustom, judulnya harus sama dengan nama kolom di Pengaturan.
            </p>
          )}
          <div className="relative overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Hasil pemeriksaan file impor</caption>
              <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
                <tr>
                  {["Baris", "Tipe", "Nama", "Kode", "Hasil"].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.slice(0, SHOWN_ROWS).map((row) => (
                  <tr key={row.rowNumber} className="align-top">
                    <td className="px-3 py-2 tabular-nums text-muted">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.type || "—"}</td>
                    <td className="min-w-40 px-3 py-2 font-medium text-fg">{row.name || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.code ?? "otomatis"}</td>
                    <td className="min-w-64 px-3 py-2">
                      {row.errors.length === 0 ? (
                        <span className="font-medium text-success">Siap diimpor</span>
                      ) : (
                        <ul className="list-disc pl-4 text-danger">
                          {row.errors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > SHOWN_ROWS && <p className="text-sm text-muted">Menampilkan {SHOWN_ROWS} baris pertama dari {preview.rows.length}.</p>}
          <Actions canConfirm={canConfirm} onConfirm={onConfirm} label={confirmLabel} hint={preview.errorCount > 0} />
        </section>
      )}

      {preview?.layout === "siman" && (
        <section className={`${panel} flex flex-col gap-4 p-5`} aria-labelledby="step2">
          <h2 id="step2" className="text-base font-semibold text-fg">
            2. Periksa hasil (format Daftar Aset)
          </h2>
          <p className="text-sm" role="status">
            <span className="font-semibold tabular-nums text-fg">{preview.rows.length}</span> baris dibaca ·{" "}
            <span className="font-semibold tabular-nums text-success">{preview.counts.NEW} baru</span> ·{" "}
            <span className="font-semibold tabular-nums text-accent">{preview.counts.UPDATE} diperbarui</span> ·{" "}
            <span className="font-semibold tabular-nums text-muted">{preview.counts.UNCHANGED} tanpa perubahan</span> ·{" "}
            <span className={`font-semibold tabular-nums ${preview.counts.ERROR ? "text-danger" : "text-fg"}`}>{preview.counts.ERROR} bermasalah</span>
          </p>
          {preview.newCategories.length > 0 && (
            <p className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-fg">
              Kategori baru yang akan dibuat: <b>{preview.newCategories.join(", ")}</b>.
            </p>
          )}

          <div role="tablist" aria-label="Kelompok baris" className="flex flex-wrap gap-1 border-b border-border">
            {(["ALL", "ERROR", "UPDATE", "NEW", "UNCHANGED"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`min-h-10 border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
                  tab === key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {key === "ALL" ? "Semua" : STATUS_LABEL[key]}
                <span className="ml-1 tabular-nums text-muted">{key === "ALL" ? preview.rows.length : preview.counts[key]}</span>
              </button>
            ))}
          </div>

          {(() => {
            const visible = preview.rows.filter((r) => tab === "ALL" || r.status === tab);
            return (
              <>
                <div className="relative overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-left text-[13px]">
                    <caption className="sr-only">Hasil pemeriksaan file Daftar Aset</caption>
                    <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
                      <tr>
                        {["Baris", "Kode Barang", "NUP", "Nama Barang", "Hasil"].map((h) => (
                          <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visible.slice(0, SHOWN_ROWS).map((row) => (
                        <tr key={row.rowNumber} className="align-top">
                          <td className="px-3 py-2 tabular-nums text-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.kodeBarang || "—"}</td>
                          <td className="px-3 py-2 tabular-nums">{row.nup || "—"}</td>
                          <td className="min-w-40 px-3 py-2 font-medium text-fg">{row.name || "—"}</td>
                          <td className="min-w-56 px-3 py-2">
                            <span className={`font-medium ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                            {row.changes.length > 0 && <p className="text-xs text-muted">Berubah: {row.changes.join(", ")}</p>}
                            {row.errors.length > 0 && (
                              <ul className="list-disc pl-4 text-danger">
                                {row.errors.map((message) => (
                                  <li key={message}>{message}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                      {visible.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-muted">
                            Tidak ada baris di kelompok ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {visible.length > SHOWN_ROWS && (
                  <p className="text-sm text-muted">
                    Menampilkan {SHOWN_ROWS} baris pertama dari {visible.length}. Semua baris tetap diproses.
                  </p>
                )}
              </>
            );
          })()}

          <Actions canConfirm={canConfirm} onConfirm={onConfirm} label={confirmLabel} hint={preview.counts.ERROR > 0} />
        </section>
      )}
    </div>
  );
}

function Actions({ canConfirm, onConfirm, label, hint }: { canConfirm: boolean; onConfirm: () => void; label: string; hint: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={buttonPrimary} disabled={!canConfirm} onClick={onConfirm}>
        {label}
      </button>
      <Link href="/inventory" className={buttonSecondary}>
        Batal
      </Link>
      {hint && <span className="text-sm text-muted">Perbaiki baris yang bermasalah di file, lalu unggah ulang. Impor hanya berjalan jika semua baris valid.</span>}
    </div>
  );
}
