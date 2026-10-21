"use client";

import { useState } from "react";
import type { InventoryFilterOptions } from "@/lib/inventory/list";
import type { InventoryPatch } from "@/lib/inventory/list-query";
import { ITEM_CONDITION_LABELS, ITEM_STATUS_LABELS } from "@/lib/inventory/labels";
import type { InventoryListQuery } from "@/validations/inventory";
import type { ColumnFilterKind } from "./columns";
import { STATUS_GROUPS, filterValueLabel, formatDateParam } from "./filter-labels";
import { CloseIcon, FilterIcon } from "./icons";
import { Popover } from "./popover";

const fieldLabel = "block text-xs font-medium text-muted";
const field =
  "mt-1 block min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-sm text-fg sm:min-h-9";

/**
 * Filter icon in a column header (InvenTree-style). Single-value filters apply
 * as soon as a value is picked; the date range stays open until "Terapkan".
 * Shares state with the filter drawer because both read and write the URL.
 */
export function ColumnFilter({
  kind,
  columnLabel,
  query,
  options,
  onApply,
}: {
  kind: ColumnFilterKind;
  columnLabel: string;
  query: InventoryListQuery;
  options: InventoryFilterOptions;
  onApply: (patch: InventoryPatch) => void;
}) {
  const active = kind === "createdAt" ? Boolean(query.from || query.to) : Boolean(query[kind]);
  const clearPatch: InventoryPatch = kind === "createdAt" ? { from: undefined, to: undefined } : { [kind]: undefined };

  const activeLabel =
    kind === "createdAt"
      ? [query.from && `dari ${formatDateParam(query.from)}`, query.to && `sampai ${formatDateParam(query.to)}`]
          .filter(Boolean)
          .join(" ")
      : filterValueLabel(kind, query, options);

  return (
    <Popover
      label={`Filter kolom ${columnLabel}${active ? " (aktif)" : ""}`}
      title={`Filter ${columnLabel}`}
      panelClassName="w-64"
      buttonClassName={`inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors duration-150 ${
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-fg"
      }`}
      buttonContent={<FilterIcon className="size-3.5" />}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          <p className="font-semibold">Filter {columnLabel}</p>

          {active && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-accent-soft px-2.5 py-1.5">
              <span className="min-w-0 truncate text-sm font-medium text-accent">{activeLabel}</span>
              <button
                type="button"
                onClick={() => {
                  onApply(clearPatch);
                  close();
                }}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded text-danger hover:bg-danger-soft"
                aria-label={`Hapus filter ${columnLabel}`}
                title="Hapus filter"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
          )}

          {kind === "createdAt" ? (
            <DateRangeFields
              from={query.from}
              to={query.to}
              onApply={(from, to) => {
                onApply({ from, to });
                close();
              }}
            />
          ) : (
            <label className={fieldLabel}>
              {active ? "Ganti nilai" : "Pilih nilai"}
              <select
                className={field}
                value={query[kind] ?? ""}
                onChange={(event) => {
                  onApply({ [kind]: event.target.value || undefined });
                  close();
                }}
              >
                <option value="">Semua</option>
                <FilterOptions kind={kind} options={options} />
              </select>
            </label>
          )}
        </div>
      )}
    </Popover>
  );
}

export function FilterOptions({
  kind,
  options,
}: {
  kind: Exclude<ColumnFilterKind, "createdAt">;
  options: InventoryFilterOptions;
}) {
  switch (kind) {
    case "type":
      return (
        <>
          <option value="BMN">BMN</option>
          <option value="ATK">ATK</option>
        </>
      );
    case "status":
      return STATUS_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.statuses.map((status) => (
            <option key={status} value={status}>
              {ITEM_STATUS_LABELS[status]}
            </option>
          ))}
        </optgroup>
      ));
    case "category":
      return options.categories.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ));
    case "location":
      return options.locations.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ));
    case "pic":
      return options.pics.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ));
    case "satker":
      return options.satkers.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ));
    case "condition":
      return (
        <>
          <option value="GOOD">{ITEM_CONDITION_LABELS.GOOD}</option>
          <option value="MINOR_DAMAGE">{ITEM_CONDITION_LABELS.MINOR_DAMAGE}</option>
          <option value="MAJOR_DAMAGE">{ITEM_CONDITION_LABELS.MAJOR_DAMAGE}</option>
        </>
      );
  }
}

function DateRangeFields({
  from,
  to,
  onApply,
}: {
  from?: string;
  to?: string;
  onApply: (from: string | undefined, to: string | undefined) => void;
}) {
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(to ?? "");
  const invalid = Boolean(start && end && start > end);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) onApply(start || undefined, end || undefined);
      }}
    >
      <label className={fieldLabel}>
        Ditambahkan dari
        <input type="date" className={field} value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className={fieldLabel}>
        Ditambahkan sampai
        <input type="date" className={field} value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
      </label>
      {invalid && <p className="text-xs font-medium text-danger">Tanggal awal harus sebelum tanggal akhir.</p>}
      <button
        type="submit"
        disabled={invalid}
        className="inline-flex min-h-9 items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
      >
        Terapkan
      </button>
    </form>
  );
}
