"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonPrimary, panel } from "@/components/ui/styles";

export function ImportPlan() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setFileName(file.name);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/purchase-plans/import", { method: "POST", body });
      if (response.status === 401) return router.push("/login");
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (response.status === 201 && data.id) return router.push(`/purchase-plans/${data.id}`);
      setError(data.error ?? "File tidak dapat diimpor.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${panel} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".xlsx" className="sr-only" id="plan-file" onChange={onFile} disabled={busy} />
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Membaca file…" : "Pilih file .xlsx"}
        </button>
        {fileName && <span className="text-sm text-muted">{fileName}</span>}
      </div>
      <p className="text-sm text-muted">Maksimal 8 MB. Foto yang tertanam di kolom Gambar ikut terbaca. Faktor harga dan PPN dibaca dari rumus di file.</p>
      {error && (
        <p role="alert" className="whitespace-pre-line rounded-md border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
