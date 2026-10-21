"use client";

import { Bell, ChevronRight, KeyRound, LogOut, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MenuLabel, MenuLink, MenuSeparator, menuItemClass } from "@/components/ui/menu";
import { buildBreadcrumb } from "@/lib/navigation";
import { OPEN_PALETTE_EVENT } from "./command-palette";

const iconButton =
  "relative inline-flex size-9 items-center justify-center rounded-md text-fg-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-fg";

/** Where the user is (DESIGN.md §9): subtle, never competing with the page title. */
export function Breadcrumb() {
  const crumbs = buildBreadcrumb(usePathname());
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted">
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-disabled" />}
            {c.href ? (
              <Link href={c.href} className="truncate hover:text-fg hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className={`truncate ${i === crumbs.length - 1 ? "font-medium text-fg" : ""}`}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Opens the quick search (Ctrl+K). */
export function SearchButton({ full = false }: { full?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label="Cari barang atau halaman (Ctrl+K)"
      className={
        full
          ? "flex min-h-11 w-full items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-muted hover:bg-surface-sunken"
          : "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-muted transition-colors duration-150 hover:border-border-strong hover:text-fg lg:w-56"
      }
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className={full ? "" : "hidden lg:inline"}>Cari barang…</span>
      <kbd className={`ml-auto rounded border border-border px-1.5 font-mono text-[11px] text-muted ${full ? "" : "hidden lg:inline"}`}>Ctrl K</kbd>
    </button>
  );
}

export interface NotificationEntry {
  label: string;
  href: string;
  count: number;
}

/** Things waiting for this user (approvals, overdue loans). The same counts as the sidebar badges. */
export function NotificationMenu({ entries }: { entries: NotificationEntry[] }) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  return (
    <Menu
      label={total > 0 ? `Notifikasi, ${total} perlu perhatian` : "Notifikasi"}
      buttonClassName={iconButton}
      panelClassName="w-72"
      buttonContent={
        <>
          <Bell aria-hidden className="size-[18px]" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-on-accent">{total}</span>
          )}
        </>
      }
    >
      <MenuLabel>
        <p className="text-sm font-semibold text-fg">Notifikasi</p>
      </MenuLabel>
      {entries.filter((e) => e.count > 0).length === 0 ? (
        <p className="px-3 pb-3 text-sm text-muted">Tidak ada yang perlu ditindaklanjuti.</p>
      ) : (
        entries
          .filter((e) => e.count > 0)
          .map((e) => (
            <MenuLink key={e.href} href={e.href}>
              <span className="flex-1">{e.label}</span>
              <span className="rounded-full bg-danger-soft px-2 text-xs font-semibold text-danger">{e.count}</span>
            </MenuLink>
          ))
      )}
    </Menu>
  );
}

/** Signed-in user, role and logout (DESIGN.md §6). */
export function AccountMenu({ name, role, username, logout }: { name: string; role: string; username: string; logout: () => Promise<void> }) {
  return (
    <Menu
      label={`Akun ${name}`}
      panelClassName="w-64"
      buttonClassName="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm text-fg transition-colors duration-150 hover:bg-surface-sunken"
      buttonContent={
        <>
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <UserRound aria-hidden className="size-4" />
          </span>
          <span className="hidden max-w-40 truncate font-medium lg:inline">{name}</span>
        </>
      }
    >
      <MenuLabel>
        <p className="truncate text-sm font-semibold text-fg">{name}</p>
        <p className="truncate text-xs text-muted">
          {role} · <span className="font-mono">{username}</span>
        </p>
      </MenuLabel>
      <MenuSeparator />
      <MenuLink href="/account/password">
        <KeyRound aria-hidden className="size-4 text-muted" />
        Ubah kata sandi
      </MenuLink>
      <form action={logout}>
        <button type="submit" role="menuitem" tabIndex={-1} className={menuItemClass}>
          <LogOut aria-hidden className="size-4 text-muted" />
          Keluar
        </button>
      </form>
    </Menu>
  );
}
