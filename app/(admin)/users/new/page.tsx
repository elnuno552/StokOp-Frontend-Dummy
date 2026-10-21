import type { Metadata } from "next";
import Link from "next/link";
import { UserForm } from "@/components/users/user-form";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { link } from "@/components/ui/styles";
import { requirePageCapability } from "@/lib/auth/page";
import { HYPER_ADMIN, isProtectedRole } from "@/lib/permissions";
import { listRoles } from "@/lib/users/service";
import { getAppSettings } from "@/lib/settings/service";
import { createUserAction } from "../actions";

export const metadata: Metadata = { title: "Tambah pengguna" };

export default async function NewUserPage() {
  const actor = await requirePageCapability("manage_users");
  if (!actor) return <Forbidden requirement="Pengelolaan pengguna hanya dapat diakses oleh peran yang diberi izin." />;

  // Only Hyper Admin may hand out the Hyper Admin and Super Admin roles.
  const { passwordMinLength } = await getAppSettings();
  const roles = (await listRoles()).filter((r) => !isProtectedRole(r.name) || actor.role === HYPER_ADMIN);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/users" className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke daftar pengguna
      </Link>
      <PageHeader title="Tambah pengguna" description="Akun baru langsung aktif dan dapat masuk dengan kata sandi awal." />
      <UserForm
        mode="create"
        action={createUserAction}
        roles={roles.map((r) => ({ value: r.name, label: r.label }))}
        initialValues={{ name: "", username: "", email: "", role: "" }}
        passwordMinLength={passwordMinLength}
      />
    </div>
  );
}
