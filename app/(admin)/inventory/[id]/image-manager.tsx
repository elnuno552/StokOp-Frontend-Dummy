"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonDanger, buttonSecondary, panel } from "@/components/ui/styles";
import { prepareImage } from "@/lib/image-prepare";

interface Image {
  id: string;
  fileName: string;
  sizeLabel: string;
  createdAtLabel: string;
}

export function ImageManager({
  itemId,
  itemName,
  images,
  canEdit,
}: {
  itemId: string;
  itemName: string;
  images: Image[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function request(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, init);
      if (response.status === 401) return router.push("/login");
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? (response.status === 413 ? "Foto terlalu besar untuk diunggah. Pilih foto yang lebih kecil." : "Permintaan gagal. Coba lagi."));
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    const prepared = await prepareImage(file);
    if (!prepared.ok) {
      setBusy(false);
      setError(prepared.error);
      return;
    }
    const body = new FormData();
    body.set("image", prepared.file);
    await request(`/api/items/${itemId}/images`, { method: "POST", body });
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic" className="sr-only" id="image-upload" onChange={onUpload} disabled={busy} />
          <button type="button" className={buttonSecondary} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? "Memproses…" : "Tambah foto"}
          </button>
          <span className="text-sm text-muted">JPG, PNG, atau HEIC. Foto yang besar dikecilkan otomatis.</span>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {images.length === 0 ? (
        <EmptyState title="Belum ada gambar" description="Foto membantu mengenali barang. Format JPG, PNG, atau HEIC. Foto yang besar dikecilkan otomatis." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <li key={img.id} className={`${panel} overflow-hidden`}>
              {/* Served by an authorized route, so next/image optimization does not apply. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/items/${itemId}/images/${img.id}`}
                alt={`${itemName}: ${img.fileName}`}
                loading="lazy"
                className="aspect-[4/3] w-full bg-surface-sunken object-contain"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="min-w-0 text-xs text-muted">
                  <span className="block truncate">{img.fileName}</span>
                  {img.sizeLabel} · {img.createdAtLabel}
                </p>
                {canEdit &&
                  (confirming === img.id ? (
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className={`${buttonDanger} min-h-9 px-3`}
                        disabled={busy}
                        onClick={() => request(`/api/items/${itemId}/images/${img.id}`, { method: "DELETE" })}
                      >
                        Ya, hapus
                      </button>
                      <button type="button" className={`${buttonSecondary} min-h-9 px-3`} onClick={() => setConfirming(null)}>
                        Batal
                      </button>
                    </span>
                  ) : (
                    <button type="button" className={`${buttonSecondary} min-h-9 shrink-0 px-3`} onClick={() => setConfirming(img.id)}>
                      Hapus
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
