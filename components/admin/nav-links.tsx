"use client";

import {
  ArrowLeftRight,
  ClipboardCheck,
  ClipboardList,
  Database,
  History,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, type NavGroup, type NavIconName } from "@/lib/navigation";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  home: LayoutDashboard,
  inventory: Package,
  locations: MapPin,
  master: Database,
  borrowings: ArrowLeftRight,
  approvals: ClipboardCheck,
  opname: ClipboardList,
  purchase: ShoppingCart,
  users: Users,
  settings: Settings,
  history: History,
  review: MessageSquare,
};

/**
 * Grouped navigation with icons (DESIGN.md §5).
 * - "mobile": full labels, used in the mobile menu panel.
 * - "sidebar": an icon rail on tablets, full labels on desktop; always the rail when the sidebar is collapsed.
 */
export function NavLinks({ groups, variant, collapsed = false }: { groups: NavGroup[]; variant: "sidebar" | "mobile"; collapsed?: boolean }) {
  const pathname = usePathname();
  const rail = variant === "sidebar";
  // Text and headings: hidden in the rail (kept for screen readers), shown from lg when expanded.
  const textClass = !rail ? "" : collapsed ? "sr-only" : "sr-only lg:not-sr-only";
  const headingClass = !rail ? "" : collapsed ? "hidden" : "hidden lg:block";
  const dividerClass = !rail ? "hidden" : collapsed ? "" : "lg:hidden";
  const alignClass = !rail ? "" : collapsed ? "justify-center" : "justify-center lg:justify-start";
  const badgeClass = !rail
    ? "ml-auto"
    : collapsed
      ? "absolute right-0.5 top-0.5"
      : "absolute right-0.5 top-0.5 lg:static lg:ml-auto";

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} role="group" aria-label={group.label}>
          {group.label && <p className={`mb-1 px-3 text-xs font-medium text-muted ${headingClass}`}>{group.label}</p>}
          {group.label && index > 0 && <hr className={`mx-2 mb-2 border-border ${dividerClass}`} />}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.matchPrefix ?? item.href);
              const Icon = NAV_ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={rail ? item.label : undefined}
                    className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150 lg:min-h-10 [@media(min-width:1024px)_and_(max-height:820px)]:min-h-9 ${alignClass} ${
                      active
                        ? "bg-accent-soft font-medium text-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
                        : "text-fg-secondary hover:bg-surface-sunken hover:text-fg"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={2} />
                    <span className={`truncate ${textClass}`}>{item.label}</span>
                    {item.badge ? (
                      <span
                        className={`min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-on-accent ${badgeClass}`}
                        aria-label={`${item.badge} perlu perhatian`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
