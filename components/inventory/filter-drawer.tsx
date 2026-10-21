"use client";

import { useRef } from "react";
import type { FieldDef } from "@/lib/custom-fields/rules";
import type { InventoryFilterOptions } from "@/lib/inventory/list";
import { activeFilterKeys, clearFiltersPatch, type InventoryPatch } from "@/lib/inventory/list-query";
import type { InventoryListQuery } from "@/validations/inventory";
import { FilterOptions } from "./column-filter";
import { FILTER_LABELS } from "./filter-labels";
import { CloseIcon, FilterIcon } from "./icons";

const fieldLabel = "block text-sm font-medium text-fg";
const field =
  "mt-1.5 block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg sm:min-h-10";

const SELECT_FILTERS = ["type", "status", "category", "location", "pic", "satker", "condition"] as const;

/** "Filter tabel" drawer: every filter in one place. Uses <dialog> for focus trapping and Escape. */
export function FilterDrawer({
  query,
  options,
  customFilters,
  buttonClassName,
  onApply,
}: {
  query: InventoryListQuery;
  options: InventoryFilterOptions;
  /** Filterable custom fields of the filtered category. */
  customFilters: FieldDef[];
  buttonClassName: string;
  onApply: (patch: InventoryPatch) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = activeFilterKeys(query);
  const customActive = customFilters.filter((f) => query.cf[f.id]);
  const activeCount = active.length + customActive.length;
  // Remount the form when filters change elsewhere (chips, column popovers).
  const formKey = [...active.map((key) => `${key}=${query[key]}`), ...customActive.map((f) => `cf.${f.id}=${query.cf[f.id]}`)].join("&");

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={buttonClassName}
        aria-label={activeCount ? `Filter tabel, ${activeCount} aktif` : "Filter tabel"}
        title="Filter tabel"
      >
        <FilterIcon />
        {activeCount > 0 && (
          <span className="min-w-4 rounded bg-accent px-1 text-[11px] font-bold leading-4 text-on-accent tabular-nums">
            {activeCount}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="filter-drawer-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-sm border-l border-border bg-surface p-0 text-fg shadow-lg backdrop:bg-slate-900/40"
      >
        <form
          key={formKey}
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const value = (name: string) => (data.get(name) as string | null) || undefined;
            const from = value("from");
            const to = value("to");
            onApply({
              type: value("type") as InventoryListQuery["type"],
              status: value("status") as InventoryListQuery["status"],
              category: value("category"),
              location: value("location"),
              pic: value("pic"),
              satker: value("satker"),
              condition: value("condition") as InventoryListQuery["condition"],
              cf: Object.fromEntries(customFilters.flatMap((f) => { const v = value(`cf.${f.id}`); return v ? [[f.id, v]] : []; })),
              // A reversed range is swapped rather than rejected.
              from: from && to && from > to ? to : from,
              to: from && to && from > to ? from : to,
            });
            close();
          }}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <h2 id="filter-drawer-title" className="flex items-center gap-2 text-base font-semibold">
              <FilterIcon className="size-4 text-accent" />
              Filter tabel
            </h2>
            <button
              type="button"
              onClick={close}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-sunken hover:text-fg"
              aria-label="Tutup filter"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {SELECT_FILTERS.map((key) => (
              <label key={key} className={fieldLabel}>
                {FILTER_LABELS[key]}
                <select name={key} defaultValue={query[key] ?? ""} className={field}>
                  <option value="">Semua</option>
                  <FilterOptions kind={key} options={options} />
                </select>
              </label>
            ))}
            {customFilters.length > 0 && (
              <fieldset className="flex flex-col gap-4 rounded-md border border-border p-3">
                <legend className="px-1 text-sm font-semibold text-fg">Kolom kategori</legend>
                {customFilters.map((f) => (
                  <label key={f.id} className={fieldLabel}>
                    {f.label}
                    {f.type === "SELECT" || f.type === "BOOLEAN" ? (
                      <select name={`cf.${f.id}`} defaultValue={query.cf[f.id] ?? ""} className={field}>
                        <option value="">Semua</option>
                        {f.type === "BOOLEAN" ? (
                          <>
                            <option value="ya">Ya</option>
                            <option value="tidak">Tidak</option>
                          </>
                        ) : (
                          f.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <input name={`cf.${f.id}`} type={f.type === "DATE" ? "date" : "text"} defaultValue={query.cf[f.id] ?? ""} autoComplete="off" className={field} />
                    )}
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset>
              <legend className={fieldLabel}>Tanggal ditambahkan</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <label className="text-xs text-muted">
                  Dari
                  <input type="date" name="from" defaultValue={query.from ?? ""} className={`${field} mt-1`} />
                </label>
                <label className="text-xs text-muted">
                  Sampai
                  <input type="date" name="to" defaultValue={query.to ?? ""} className={`${field} mt-1`} />
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
            <button
              type="submit"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover sm:min-h-10"
            >
              Terapkan
            </button>
            <button
              type="button"
              disabled={activeCount === 0}
              onClick={() => {
                onApply(clearFiltersPatch());
                close();
              }}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-border-strong px-4 text-sm font-semibold text-fg hover:bg-surface-sunken disabled:opacity-50 sm:min-h-10"
            >
              Hapus semua filter
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
