"use client";

import { Boxes, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { NavGroup } from "@/lib/navigation";
import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE } from "@/lib/sidebar";
import { NavLinks } from "./nav-links";
import { Breadcrumb } from "./topbar";

/**
 * Application frame (DESIGN.md §4, §34): sidebar + topbar + content.
 * - Desktop: full sidebar, collapsible to an icon rail (choice kept in a cookie so the first paint is right).
 * - Tablet: icon rail.
 * - Mobile: the top bar with a menu (`top`), no sidebar.
 */
export function SidebarShell({
  initialCollapsed,
  title,
  groups,
  top,
  topbarActions,
  children,
}: {
  initialCollapsed: boolean;
  title: string;
  groups: NavGroup[];
  /** Skip link and mobile menu; rendered above everything else. */
  top: React.ReactNode;
  /** Right side of the topbar: search, notifications, account. */
  topbarActions: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? SIDEBAR_COLLAPSED : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  const expanded = !collapsed;

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      {top}

      <aside
        id="sidebar"
        aria-label="Navigasi utama"
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex md:w-16 ${expanded ? "lg:w-60" : ""}`}
      >
        <Link href="/" className={`flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4 ${expanded ? "justify-center lg:justify-start" : "justify-center"}`}>
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-on-accent">
            <Boxes aria-hidden className="size-[18px]" />
          </span>
          <span className={`truncate text-sm font-semibold text-fg ${expanded ? "sr-only lg:not-sr-only" : "sr-only"}`}>{title}</span>
        </Link>
        <nav aria-label="Menu utama" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          <NavLinks groups={groups} variant="sidebar" collapsed={collapsed} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:flex lg:px-8">
          <button
            type="button"
            onClick={toggle}
            aria-controls="sidebar"
            aria-expanded={expanded}
            aria-label={collapsed ? "Tampilkan sidebar" : "Ciutkan sidebar"}
            title={collapsed ? "Tampilkan sidebar" : "Ciutkan sidebar"}
            className="hidden size-9 shrink-0 items-center justify-center rounded-md text-fg-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-fg lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen aria-hidden className="size-[18px]" /> : <PanelLeftClose aria-hidden className="size-[18px]" />}
          </button>
          <div className="min-w-0 flex-1">
            <Breadcrumb />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{topbarActions}</div>
        </header>
        <main id="konten" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
