import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/permissions";

const tag = "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold";

export function StatusTag({ isActive }: { isActive: boolean }) {
  return isActive ? <Badge tone="success">Aktif</Badge> : <Badge tone="neutral">Nonaktif</Badge>;
}

export function RoleTag({ role }: { role: string }) {
  return (
    <span className={`${tag} border border-border text-fg`}>{roleLabel(role)}</span>
  );
}
