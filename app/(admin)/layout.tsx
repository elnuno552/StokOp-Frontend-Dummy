import Link from "next/link";
import { cookies } from "next/headers";
import { CommandPalette } from "@/components/admin/command-palette";
import { MobileMenu } from "@/components/admin/mobile-menu";
import { NavLinks } from "@/components/admin/nav-links";
import { SidebarShell } from "@/components/admin/sidebar-shell";
import { AccountMenu, NotificationMenu, SearchButton } from "@/components/admin/topbar";
import { Toaster } from "@/components/ui/toast";
import { signOut } from "@/lib/auth";
import { requirePageAuth } from "@/lib/auth/page";
import { countPendingApprovals } from "@/lib/approvals/service";
import { getBorrowingBadge } from "@/lib/borrowing/list";
import { flattenGroups, visibleGroups, type NavGroup } from "@/lib/navigation";
import { roleLabel, canAccessHistoryLog, canManageSettings, canManageUsers, canReadInventory, canViewOperations } from "@/lib/permissions";
import { SIDEBAR_COOKIE, parseSidebarCollapsed } from "@/lib/sidebar";

const APP_NAME = "Sistem Inventory";

// Shell only. Every page and server action still performs its own
// authorization check (layouts do not re-run on client navigation).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageAuth();
  const cookieStore = await cookies();
  const sidebarCollapsed = parseSidebarCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value);
  const [borrowingBadge, approvalBadge] = await Promise.all([getBorrowingBadge(user), countPendingApprovals(user)]);

  const read = canReadInventory(user.role);
  const ops = canViewOperations(user.role);
  // Only modules that exist, grouped as in DESIGN.md §5. Staff (read-only) sees Beranda, Inventaris and Lokasi.
  const groups: NavGroup[] = visibleGroups([
    { items: [{ href: "/", label: "Beranda", icon: "home" }] },
    {
      label: "Inventaris",
      items: [
        ...(read ? [{ href: "/inventory", label: "Inventaris", icon: "inventory" as const }, { href: "/locations", label: "Lokasi", icon: "locations" as const }] : []),
        ...(ops ? [{ href: "/master/locations", label: "Data master", icon: "master" as const, matchPrefix: "/master" }] : []),
      ],
    },
    {
      label: "Transaksi",
      items: ops
        ? [
            { href: "/borrowings", label: "Peminjaman", icon: "borrowings", badge: borrowingBadge },
            { href: "/approvals", label: "Persetujuan", icon: "approvals", badge: approvalBadge },
            { href: "/opname", label: "Stock opname", icon: "opname" },
            { href: "/purchase-plans", label: "Rencana pembelian", icon: "purchase" },
          ]
        : [],
    },
    {
      label: "Administrasi",
      items: [
        ...(canManageUsers(user.role) ? [{ href: "/users", label: "Pengguna", icon: "users" as const }] : []),
        ...(canManageSettings(user.role) ? [{ href: "/settings", label: "Pengaturan", icon: "settings" as const }] : []),
        ...(canAccessHistoryLog(user.role) ? [{ href: "/history", label: "History Log", icon: "history" as const }] : []),
        // Every signed-in user may send a review; only administrators see the list (checked on the page).
        { href: "/reviews", label: "User Review", icon: "review" as const },
      ],
    },
  ]);

  const notifications = ops
    ? [
        { label: "Persetujuan menunggu", href: "/approvals", count: approvalBadge },
        { label: "Peminjaman perlu perhatian", href: "/borrowings", count: borrowingBadge },
      ]
    : [];

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <SidebarShell
      initialCollapsed={sidebarCollapsed}
      title={APP_NAME}
      groups={groups}
      top={
        <>
          <a
            href="#konten"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent"
          >
            Lewati ke konten utama
          </a>
          <MobileMenu title={APP_NAME}>
            <div className="flex flex-col gap-4">
              {read && <SearchButton full />}
              <nav aria-label="Menu utama">
                <NavLinks groups={groups} variant="mobile" />
              </nav>
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
                  <p className="truncate text-xs text-muted">
                    {roleLabel(user.role)} · <span className="font-mono">{user.username}</span>
                  </p>
                </div>
                <Link href="/account/password" className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-strong px-3 text-sm font-medium text-fg hover:bg-surface-sunken">
                  Ubah kata sandi
                </Link>
                <form action={logout}>
                  <button type="submit" className="min-h-11 w-full rounded-md border border-border-strong px-3 text-sm font-medium text-fg hover:bg-surface-sunken">
                    Keluar
                  </button>
                </form>
              </div>
            </div>
          </MobileMenu>
        </>
      }
      topbarActions={
        <>
          {read && <SearchButton />}
          {ops && <NotificationMenu entries={notifications} />}
          <AccountMenu name={user.name} role={roleLabel(user.role)} username={user.username} logout={logout} />
        </>
      }
    >
      <p className="mb-4 rounded-md border border-border bg-surface-sunken px-3 py-2 text-xs text-muted">
        Versi demo antarmuka: data di halaman ini hanyalah contoh dan perubahan tidak disimpan.
      </p>
      {children}
      <CommandPalette links={flattenGroups(groups)} />
      <Toaster />
    </SidebarShell>
  );
}
