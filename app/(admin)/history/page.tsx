import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { buttonPrimary, buttonSecondary, input, label, panel } from "@/components/ui/styles";
import { requirePageCapability } from "@/lib/auth/page";
import { HISTORY_ACTIONS } from "@/lib/history/log";
import { listHistory } from "@/lib/history/list";
import { roleLabel } from "@/lib/permissions";
import { HISTORY_PAGE_SIZE, historyQuerySchema, type HistoryQuery } from "@/validations/history";

export const metadata: Metadata = { title: "History Log" };

function pageHref(query: HistoryQuery, page: number) {
  const params = new URLSearchParams();
  for (const key of ["q", "module", "action", "from", "to"] as const) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/history?${qs}` : "/history";
}

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const actor = await requirePageCapability("view_history");
  if (!actor) return <Forbidden requirement="History Log hanya dapat dilihat oleh peran yang diberi izin (bawaan: Super Admin)." />;

  const query = historyQuerySchema.parse(await searchParams);
  const { rows, total, page, pageCount, modules } = await listHistory(actor, query);
  const filtered = Boolean(query.q || query.module || query.action || query.from || query.to);
  const first = total === 0 ? 0 : (page - 1) * HISTORY_PAGE_SIZE + 1;
  const last = Math.min(page * HISTORY_PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="History Log" description="Catatan semua perubahan penting di sistem. Data ini hanya bertambah dan tidak dapat diubah." />

      <form method="get" role="search" aria-label="Filter History Log" className={`${panel} grid grid-cols-2 gap-x-3 gap-y-4 p-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end`}>
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="q" className={label}>
            Cari
          </label>
          <input id="q" name="q" type="search" defaultValue={query.q ?? ""} placeholder="Deskripsi atau nama pengguna" className={`${input} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="module" className={label}>
            Modul
          </label>
          <select id="module" name="module" defaultValue={query.module ?? ""} className={`${input} mt-1.5`}>
            <option value="">Semua modul</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="action" className={label}>
            Aksi
          </label>
          <select id="action" name="action" defaultValue={query.action ?? ""} className={`${input} mt-1.5`}>
            <option value="">Semua aksi</option>
            {HISTORY_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className={label}>
            Dari tanggal
          </label>
          <input id="from" name="from" type="date" defaultValue={query.from ?? ""} className={`${input} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="to" className={label}>
            Sampai tanggal
          </label>
          <input id="to" name="to" type="date" defaultValue={query.to ?? ""} className={`${input} mt-1.5`} />
        </div>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button type="submit" className={buttonPrimary}>
            Terapkan
          </button>
          {filtered && (
            <Link href="/history" className={buttonSecondary}>
              Atur ulang
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={filtered ? "Tidak ada catatan yang cocok" : "Belum ada catatan"}
          description={filtered ? "Ubah atau hapus filter untuk melihat catatan lain." : "Perubahan penting di sistem akan tercatat di sini."}
        />
      ) : (
        <div className={`${panel} relative overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">
              History Log, {first} sampai {last} dari {total}
            </caption>
            <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
              <tr>
                {["Waktu", "Pengguna", "Aksi", "Modul", "Deskripsi"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">{r.createdAtLabel}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-fg">{r.userName}</p>
                    <p className="text-xs text-muted">{roleLabel(r.role)}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-fg">{r.action}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-fg">{r.module}</td>
                  <td className="min-w-64 px-3 py-2 text-fg">
                    <p>{r.description ?? "—"}</p>
                    {(r.oldValue || r.newValue || r.ipAddress) && (
                      <details className="mt-1 text-xs text-muted">
                        <summary className="cursor-pointer hover:text-fg">Rincian</summary>
                        {r.ipAddress && <p className="mt-1">IP: <span className="font-mono">{r.ipAddress}</span></p>}
                        {r.oldValue && (
                          <>
                            <p className="mt-1 font-semibold">Sebelum</p>
                            <pre className="overflow-x-auto rounded bg-surface-sunken p-2 font-mono">{r.oldValue}</pre>
                          </>
                        )}
                        {r.newValue && (
                          <>
                            <p className="mt-1 font-semibold">Sesudah</p>
                            <pre className="overflow-x-auto rounded bg-surface-sunken p-2 font-mono">{r.newValue}</pre>
                          </>
                        )}
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            label="Halaman History Log"
            page={page}
            pageCount={pageCount}
            pageSize={HISTORY_PAGE_SIZE}
            total={total}
            linkProps={(p) => ({ href: pageHref(query, p) })}
            className="border-t border-border px-3 py-2.5"
          />
        </div>
      )}
    </div>
  );
}
