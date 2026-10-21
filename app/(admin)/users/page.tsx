import { FlashToast } from "@/components/ui/toast";
import type { Metadata } from "next";
import Link from "next/link";
import { RoleTag, StatusTag } from "@/components/users/user-tags";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { buttonPrimary, buttonSecondary, input, label, link, panel } from "@/components/ui/styles";
import { requirePageCapability } from "@/lib/auth/page";
import { formatDateTime } from "@/lib/format";
import { listRoles } from "@/lib/users/service";
import { listUsers } from "@/lib/users/service";
import { USER_PAGE_SIZES, userListQuerySchema, type UserListQuery } from "@/validations/user";

export const metadata: Metadata = { title: "Pengguna" };

function pageHref(query: UserListQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  if (query.pageSize !== 10) params.set("pageSize", String(query.pageSize));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/users?${qs}` : "/users";
}

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const actor = await requirePageCapability("manage_users");
  if (!actor) return <Forbidden requirement="Pengelolaan pengguna hanya dapat diakses oleh peran yang diberi izin." />;
  const roleOptions = await listRoles();

  const params = await searchParams;
  const query = userListQuerySchema.parse(params);
  const { rows, total, page, pageCount, pageSize } = await listUsers(actor, query);
  const filtered = Boolean(query.q || query.role || query.status);
  const createdUsername = params.notice === "created" && typeof params.u === "string" ? params.u : null;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengguna"
        description="Akun yang dapat masuk ke sistem beserta perannya."
        actions={
          <Link href="/users/new" className={buttonPrimary}>
            Tambah pengguna
          </Link>
        }
      />

      {createdUsername && <FlashToast message={`Pengguna ${createdUsername} berhasil ditambahkan.`} params={["notice", "u"]} />}

      {/* Plain GET form: filters work without JavaScript and stay in the URL. */}
      <form method="get" role="search" aria-label="Filter pengguna" className={`${panel} grid grid-cols-2 gap-x-3 gap-y-4 p-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end lg:gap-4`}>
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="q" className={label}>
            Cari
          </label>
          <input id="q" name="q" type="search" defaultValue={query.q ?? ""} placeholder="Nama, username, atau email" className={`${input} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="role" className={label}>
            Peran
          </label>
          <select id="role" name="role" defaultValue={query.role ?? ""} className={`${input} mt-1.5`}>
            <option value="">Semua peran</option>
            {roleOptions.map((role) => (
              <option key={role.name} value={role.name}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className={label}>
            Status
          </label>
          <select id="status" name="status" defaultValue={query.status ?? ""} className={`${input} mt-1.5`}>
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div>
          <label htmlFor="pageSize" className={label}>
            Per halaman
          </label>
          <select id="pageSize" name="pageSize" defaultValue={String(pageSize)} className={`${input} mt-1.5`}>
            {USER_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={`${buttonPrimary} flex-1 lg:flex-none`}>
            Terapkan
          </button>
          {filtered && (
            <Link href="/users" className={`${buttonSecondary} flex-1 lg:flex-none`}>
              Reset
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className={`${panel} px-5 py-10 text-center`}>
          {filtered ? (
            <>
              <p className="font-semibold text-fg">Tidak ada pengguna yang cocok dengan filter ini.</p>
              <p className="mt-1 text-sm text-muted">
                Ubah kata kunci atau{" "}
                <Link href="/users" className={link}>
                  tampilkan semua pengguna
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-fg">Belum ada pengguna.</p>
              <p className="mt-1 text-sm text-muted">Tambahkan akun pertama untuk admin BMN atau ATK.</p>
            </>
          )}
        </div>
      ) : (
        <div className={`${panel} overflow-hidden`}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Daftar pengguna, {first} sampai {last} dari {total}
            </caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Pengguna</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Username</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Peran</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Status</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Login terakhir</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((user) => (
                <tr key={user.id} className={user.isActive ? undefined : "bg-surface-sunken/50"}>
                  <td className="max-w-0 px-4 py-3 sm:max-w-none">
                    <p className="truncate font-semibold text-fg">
                      {user.name}
                      {user.id === actor.id && <span className="ml-1.5 font-normal text-muted">(Anda)</span>}
                    </p>
                    <p className="truncate text-muted">{user.email}</p>
                    <p className="truncate font-mono text-xs text-muted md:hidden">{user.username}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
                      <RoleTag role={user.role.name} />
                      <StatusTag isActive={user.isActive} />
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-fg md:table-cell">{user.username}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <RoleTag role={user.role.name} />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusTag isActive={user.isActive} />
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-muted lg:table-cell">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Belum pernah"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/users/${user.id}/edit`} className={`${link} inline-flex min-h-11 items-center sm:min-h-0`}>
                      Ubah<span className="sr-only"> {user.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <Pagination label="Halaman daftar pengguna" page={page} pageCount={pageCount} pageSize={pageSize} total={total} linkProps={(p) => ({ href: pageHref(query, p) })} />
      )}
    </div>
  );
}
