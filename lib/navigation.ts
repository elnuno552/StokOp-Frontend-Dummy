// Navigation model shared by the sidebar, the mobile menu, the command palette and the breadcrumb. Pure and
// client-safe. Icons are named here and mapped to Lucide components in the client (functions cannot cross from
// server to client components).

export type NavIconName =
  | "home"
  | "inventory"
  | "locations"
  | "master"
  | "borrowings"
  | "approvals"
  | "opname"
  | "purchase"
  | "users"
  | "settings"
  | "history"
  | "review";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  /** Path prefix that keeps this item highlighted (defaults to href). */
  matchPrefix?: string;
  /** Count of things needing attention; hidden when zero. */
  badge?: number;
}

export interface NavGroup {
  /** Group heading; the first group (Beranda) has none. */
  label?: string;
  items: NavItem[];
}

/** Drop empty groups (the role may see none of their items). */
export function visibleGroups(groups: NavGroup[]): NavGroup[] {
  return groups.filter((g) => g.items.length > 0);
}

export function flattenGroups(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// ---------------------------------------------------------------------------
// Breadcrumb (DESIGN.md §9)
// ---------------------------------------------------------------------------

const ID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Label of each page, by path with ids replaced by ":id". `link: false` marks a level that is not a page itself. */
const CRUMBS: Record<string, { label: string; link?: false }> = {
  "/inventory": { label: "Inventaris" },
  "/inventory/new": { label: "Tambah barang" },
  "/inventory/import": { label: "Impor" },
  "/inventory/:id": { label: "Detail barang" },
  "/inventory/:id/edit": { label: "Ubah" },
  "/locations": { label: "Lokasi" },
  "/borrowings": { label: "Peminjaman" },
  "/approvals": { label: "Persetujuan" },
  "/master": { label: "Data master", link: false },
  "/master/locations": { label: "Lokasi" },
  "/master/categories": { label: "Kategori" },
  "/master/employees": { label: "Pegawai" },
  "/opname": { label: "Stock opname" },
  "/opname/new": { label: "Mulai opname" },
  "/opname/:id": { label: "Detail sesi" },
  "/purchase-plans": { label: "Rencana pembelian" },
  "/purchase-plans/new": { label: "Buat RAB" },
  "/purchase-plans/import": { label: "Impor RAB" },
  "/purchase-plans/:id": { label: "Detail RAB" },
  "/users": { label: "Pengguna" },
  "/users/new": { label: "Tambah pengguna" },
  "/users/:id/edit": { label: "Ubah pengguna" },
  "/settings": { label: "Pengaturan" },
  "/settings/stock-minimum": { label: "Stok minimum" },
  "/settings/custom-fields": { label: "Kolom kustom" },
  "/settings/roles": { label: "Peran dan hak akses" },
  "/settings/security": { label: "Keamanan" },
  "/account": { label: "Akun", link: false },
  "/account/password": { label: "Ubah kata sandi" },
  "/history": { label: "History Log" },
  "/reviews": { label: "User Review" },
};

export interface Crumb {
  label: string;
  /** Null for the current page and for levels that are not pages. */
  href: string | null;
}

/** Trail from Beranda to the current page. Unknown levels are skipped; the last crumb is never a link. */
export function buildBreadcrumb(pathname: string): Crumb[] {
  const segments = pathname.split("?")[0].split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Beranda", href: "/" }];
  let real = "";
  let pattern = "";
  for (const segment of segments) {
    real += `/${segment}`;
    pattern += ID_SEGMENT.test(segment) ? "/:id" : `/${segment}`;
    const entry = CRUMBS[pattern];
    if (entry) crumbs.push({ label: entry.label, href: entry.link === false ? null : real });
  }
  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { ...last, href: null };
  return crumbs;
}
