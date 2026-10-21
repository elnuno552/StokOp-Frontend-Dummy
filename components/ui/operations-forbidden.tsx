import { Forbidden } from "./forbidden";

/** Shown to the read-only Staff role on admin-only screens (the server also refuses the data). */
export function OperationsForbidden() {
  return <Forbidden requirement="Halaman ini hanya untuk admin. Peran Staf dapat melihat Beranda, Inventaris, dan Lokasi." />;
}
