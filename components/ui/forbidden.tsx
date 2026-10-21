import Link from "next/link";
import { buttonSecondary } from "./styles";

/** Shown when a signed-in user opens a page their role may not access. */
export function Forbidden({ requirement }: { requirement: string }) {
  return (
    <section aria-labelledby="forbidden-title" className="max-w-lg py-8">
      <p className="text-sm font-semibold text-danger">Akses ditolak (403)</p>
      <h1 id="forbidden-title" className="mt-2 text-2xl font-semibold text-fg">
        Halaman ini tidak tersedia untuk peran Anda
      </h1>
      <p className="mt-2 text-sm text-muted">{requirement}</p>
      <Link href="/" className={`${buttonSecondary} mt-6`}>
        Kembali ke beranda
      </Link>
    </section>
  );
}
