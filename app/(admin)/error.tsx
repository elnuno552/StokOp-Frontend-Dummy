"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { buttonPrimary, panel } from "@/components/ui/styles";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // DESIGN.md §29: understandable, no internal details. The digest lets support find the server log.
  return (
    <section role="alert" className={`${panel} mx-auto mt-6 flex max-w-lg flex-col items-center px-6 py-10 text-center`}>
      <CircleAlert aria-hidden className="mb-3 size-8 text-danger" strokeWidth={1.75} />
      <h1 className="text-lg font-semibold text-fg">Data Tidak Dapat Dimuat</h1>
      <p className="mt-1 text-sm text-muted">
        Terjadi kesalahan saat mengambil data. Silakan coba kembali. Jika masih gagal, hubungi pengelola sistem
        {error.digest ? ` dan sebutkan kode ${error.digest}` : ""}.
      </p>
      <button type="button" onClick={() => retry()} className={`${buttonPrimary} mt-6`}>
        Coba Lagi
      </button>
    </section>
  );
}
