"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { hint, input, label, panel } from "@/components/ui/styles";
import type { MinimumGroup } from "@/lib/stock-minimum/service";
import { saveMinimumsAction, type MinimumFormState } from "./actions";

const typed = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export function MinimumForm({ groups }: { groups: MinimumGroup[] }) {
  const [state, action] = useActionState<MinimumFormState, FormData>(saveMinimumsAction, {});

  return (
    <form action={action} key={state.attempt ?? "initial"} className="flex max-w-4xl flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-medium text-success">
          {state.message}
        </p>
      )}

      <div className={`${panel} p-5`}>
        <label className="flex items-start gap-2.5 text-sm text-fg">
          <input type="checkbox" name="applyDefaults" className="mt-0.5 size-4 accent-accent" />
          <span>
            Isi minimum barang yang masih kosong dengan bawaan kategorinya
            <span className="block text-muted">Barang yang sudah punya minimum tidak diubah. Barang ATK baru otomatis mewarisi bawaan kategorinya.</span>
          </span>
        </label>
      </div>

      {groups.length === 0 && <EmptyState title="Belum ada barang ATK" description="Stok minimum dapat diatur setelah barang ATK ditambahkan di Inventaris." />}

      {groups.map((g) => (
        <section key={g.categoryId ?? "none"} className={panel} aria-label={g.categoryName}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-fg">
              {g.categoryName} <span className="text-sm font-normal text-muted">· {g.items.length} barang</span>
            </h2>
            {g.categoryId && (
              <div>
                <label htmlFor={`cat-${g.categoryId}`} className={label}>
                  Bawaan kategori
                </label>
                <input id={`cat-${g.categoryId}`} name={`cat:${g.categoryId}`} defaultValue={typed(g.defaultMinimum)} inputMode="decimal" autoComplete="off" placeholder="Kosong" className={`${input} mt-1 w-32 text-right tabular-nums`} />
              </div>
            )}
          </div>
          {g.items.length > 0 && (
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <caption className="sr-only">Stok minimum {g.categoryName}</caption>
                <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">
                      Barang
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Stok
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Minimum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {g.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-1.5">
                        <span className="font-medium text-fg">{i.name}</span> <span className="font-mono text-xs text-muted">{i.code}</span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${i.minimum !== null && i.quantity <= i.minimum ? "font-semibold text-danger" : ""}`}>
                        {typed(i.quantity)} {i.unit}
                      </td>
                      <td className="px-3 py-1.5">
                        <label className="sr-only" htmlFor={`min-${i.id}`}>
                          Minimum {i.name}
                        </label>
                        <input id={`min-${i.id}`} name={`item:${i.id}`} defaultValue={typed(i.minimum)} inputMode="decimal" autoComplete="off" placeholder="Kosong" className="h-9 w-28 rounded-md border border-border-strong bg-surface px-2 text-right text-sm tabular-nums text-fg" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <p className={hint}>Kosong berarti tanpa minimum: barang hanya dianggap menipis bila stoknya 0. Desimal memakai koma (contoh 2,5), tanpa titik ribuan.</p>
      <div>
        <SubmitButton pendingLabel="Menyimpan…">Simpan stok minimum</SubmitButton>
      </div>
    </form>
  );
}
