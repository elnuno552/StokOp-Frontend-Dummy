"use client";

import { useEffect } from "react";
import { buttonPrimary } from "@/components/ui/styles";

// Catches failures above the admin shell too (e.g. the session check in the
// admin layout cannot reach the database), so it renders its own <main>.
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main role="alert" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold text-fg">Sistem tidak dapat dimuat</h1>
      <p className="mt-2 text-sm text-muted">
        Server tidak dapat menyelesaikan permintaan, misalnya karena database tidak dapat dihubungi. Coba lagi dalam
        beberapa saat. Jika masih gagal, hubungi pengelola sistem{error.digest ? ` dan sebutkan kode ${error.digest}` : ""}.
      </p>
      <button type="button" onClick={() => retry()} className={`${buttonPrimary} mt-6 w-fit`}>
        Coba lagi
      </button>
    </main>
  );
}
