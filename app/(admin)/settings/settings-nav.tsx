import Link from "next/link";
import { canManageRoles, canManageSettings, type RoleName } from "@/lib/permissions";

const TABS = [
  { href: "/settings", label: "Umum", show: (role: RoleName) => canManageSettings(role) },
  { href: "/settings/stock-minimum", label: "Stok minimum", show: (role: RoleName) => canManageSettings(role) },
  { href: "/settings/custom-fields", label: "Kolom kustom", show: (role: RoleName) => canManageSettings(role) },
  { href: "/settings/security", label: "Keamanan", show: (role: RoleName) => canManageSettings(role) },
  { href: "/settings/roles", label: "Peran dan hak akses", show: (role: RoleName) => canManageRoles(role) },
] as const;

/** Sub-navigation of the Pengaturan pages; tabs the user may not open are left out. */
export function SettingsNav({ role, current }: { role: RoleName; current: string }) {
  const tabs = TABS.filter((t) => t.show(role));
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Bagian pengaturan" className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium transition-colors duration-150 ${
            t.href === current ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border-strong bg-surface text-fg hover:bg-surface-sunken"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
