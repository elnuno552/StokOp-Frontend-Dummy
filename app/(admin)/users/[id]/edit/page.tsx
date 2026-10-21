import { FlashToast } from "@/components/ui/toast";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserForm } from "@/components/users/user-form";
import { UserStatusControl } from "@/components/users/user-status-control";
import { RoleTag, StatusTag } from "@/components/users/user-tags";
import { Forbidden } from "@/components/ui/forbidden";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { link, panel } from "@/components/ui/styles";
import { requirePageCapability } from "@/lib/auth/page";
import { formatDateTime } from "@/lib/format";
import { HYPER_ADMIN, isProtectedRole } from "@/lib/permissions";
import { getUser, listRoles } from "@/lib/users/service";
import { getAppSettings } from "@/lib/settings/service";
import { setUserActiveAction, updateUserAction } from "../../actions";

export const metadata: Metadata = { title: "Ubah pengguna" };

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  updated: { tone: "success", text: "Perubahan data pengguna tersimpan." },
  unchanged: { tone: "info", text: "Tidak ada perubahan yang disimpan." },
  deactivated: { tone: "success", text: "Akun dinonaktifkan. Pengguna tidak dapat masuk lagi." },
  activated: { tone: "success", text: "Akun diaktifkan kembali." },
  "self-status": { tone: "error", text: "Anda tidak dapat menonaktifkan akun sendiri." },
  "status-error": { tone: "error", text: "Status akun tidak dapat diubah. Muat ulang halaman lalu coba lagi." },
  forbidden: { tone: "error", text: "Hanya Hyper Admin yang dapat mengelola akun Hyper Admin dan Super Admin." },
};

export default async function EditUserPage({ params, searchParams }: PageProps<"/users/[id]/edit">) {
  const actor = await requirePageCapability("manage_users");
  if (!actor) return <Forbidden requirement="Pengelolaan pengguna hanya dapat diakses oleh peran yang diberi izin." />;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getUser(actor, id);
  if (!user) notFound();

  const { notice } = await searchParams;
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;
  const isSelf = user.id === actor.id;
  // Only Hyper Admin may hand out the Hyper Admin and Super Admin roles (an account already holding one keeps it in the list).
  const { passwordMinLength } = await getAppSettings();
  const roles = (await listRoles()).filter((r) => !isProtectedRole(r.name) || actor.role === HYPER_ADMIN || user.role.name === r.name);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/users" className={`${link} inline-flex min-h-11 w-fit items-center text-sm`}>
        Kembali ke daftar pengguna
      </Link>
      <PageHeader
        title={user.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono">{user.username}</span>
            <RoleTag role={user.role.name} />
            <StatusTag isActive={user.isActive} />
          </span>
        }
      />

      {message &&
        (message.tone === "error" ? <Notice tone="error">{message.text}</Notice> : <FlashToast message={message.text} tone={message.tone} params={["notice"]} />)}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <section aria-labelledby="data-akun">
          <h2 id="data-akun" className="mb-4 text-lg font-semibold text-fg">
            Data akun
          </h2>
          <UserForm
            key={user.id}
            mode="edit"
            action={updateUserAction.bind(null, user.id)}
            roles={roles.map((r) => ({ value: r.name, label: r.label }))}
            initialValues={{ name: user.name, username: user.username, email: user.email, role: user.role.name }}
            roleLockedReason={isSelf ? "Anda tidak dapat mengubah peran akun sendiri." : undefined}
            passwordMinLength={passwordMinLength}
          />
        </section>

        <aside className="flex max-w-2xl flex-col gap-4">
          <section aria-labelledby="status-akun" className={`${panel} p-5`}>
            <h2 id="status-akun" className="text-base font-semibold text-fg">
              Status akun
            </h2>
            <p className="mb-4 mt-1 text-sm text-muted">
              {user.isActive
                ? "Akun aktif dan dapat masuk ke sistem."
                : "Akun nonaktif. Pengguna tidak dapat masuk sampai diaktifkan kembali."}
            </p>
            <UserStatusControl
              userName={user.name}
              isActive={user.isActive}
              action={setUserActiveAction.bind(null, user.id, !user.isActive)}
              lockedReason={isSelf ? "Ini akun Anda. Akun sendiri tidak dapat dinonaktifkan." : undefined}
            />
          </section>

          <dl className={`${panel} grid gap-3 p-5 text-sm`}>
            <div>
              <dt className="text-muted">Login terakhir</dt>
              <dd className="tabular-nums text-fg">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Belum pernah"}</dd>
            </div>
            <div>
              <dt className="text-muted">Dibuat</dt>
              <dd className="tabular-nums text-fg">{formatDateTime(user.createdAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
