import Link from "next/link";
import { buttonSecondary } from "./styles";

export function NotFoundContent() {
  return (
    <>
      <p className="text-sm font-semibold text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-fg">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted">Alamat yang Anda buka tidak ada atau datanya sudah tidak tersedia.</p>
      <Link href="/" className={`${buttonSecondary} mt-6 w-fit`}>
        Kembali ke beranda
      </Link>
    </>
  );
}
