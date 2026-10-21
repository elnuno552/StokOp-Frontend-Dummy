import type { Metadata } from "next";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageAuth } from "@/lib/auth/page";
import { canManageRoles, isProtectedRole } from "@/lib/permissions";
import { listRolesDetailed } from "@/lib/roles/service";
import { SettingsNav } from "../settings-nav";
import { CreateRoleDialog, RoleCard } from "./role-forms";

export const metadata: Metadata = { title: "Peran dan hak akses" };

export default async function RolesPage() {
  const actor = await requirePageAuth();
  if (!canManageRoles(actor.role)) return <Forbidden requirement="Peran dan hak akses hanya dapat diatur oleh Hyper Admin." />;

  const roles = await listRolesDetailed(actor);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Atur kemampuan setiap peran dengan kotak centang, atau buat peran baru. Perubahan berlaku dalam beberapa detik dan tercatat di History Log."
        actions={<CreateRoleDialog presets={roles.filter((r) => !isProtectedRole(r.name)).map((r) => ({ name: r.name, label: r.label }))} />}
      />
      <SettingsNav role={actor.role} current="/settings/roles" />
      <div className="flex max-w-3xl flex-col gap-4">
        {roles.map((r) => (
          <RoleCard key={r.name} role={r} />
        ))}
      </div>
    </div>
  );
}
