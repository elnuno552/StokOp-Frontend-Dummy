"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FieldDef } from "@/lib/custom-fields/rules";
import type { InventoryFilterOptions, InventoryRow } from "@/lib/inventory/list";
import { ITEM_CONDITION_LABELS } from "@/lib/inventory/labels";
import {
  activeFilterKeys,
  clearFiltersPatch,
  inventoryHref,
  inventoryParams,
  type InventoryPatch,
} from "@/lib/inventory/list-query";
import { INVENTORY_PAGE_SIZES, type InventoryListQuery } from "@/validations/inventory";
import { ColumnFilter } from "./column-filter";
import { ColumnMenu } from "./column-menu";
import { INVENTORY_COLUMNS, saveVisibleColumns, type InventoryColumnKey } from "./columns";
import { ExportMenu } from "./export-menu";
import { FilterDrawer } from "./filter-drawer";
import { FILTER_LABELS, filterValueLabel } from "./filter-labels";
import { SavedFilters } from "./saved-filters";
import { MOVEMENT_TITLES, MovementDialog } from "./movement-dialog";
import type { MovementKind } from "@/validations/movement";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { MenuLink } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { RowActions } from "@/components/ui/row-actions";
import { CloseIcon, RefreshIcon, SearchIcon, SortIcon } from "./icons";
import { StatusBadge, TypeBadge } from "./status-badge";

const toolButton =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 text-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg";

const SEARCH_DELAY_MS = 500;

export function InventoryTable({
  rows,
  total,
  pageCount,
  query,
  options,
  customColumns,
  customFilters,
  initialColumns,
  mutableTypes,
}: {
  rows: InventoryRow[];
  total: number;
  pageCount: number;
  query: InventoryListQuery;
  options: InventoryFilterOptions;
  /** Custom field columns and filters of the filtered category (empty without a category filter). */
  customColumns: { id: string; label: string }[];
  customFilters: FieldDef[];
  initialColumns: InventoryColumnKey[];
  /** Item types the signed-in role may change; the server re-checks every bulk action. */
  mutableTypes: ItemType[];
}) {
  const router = useRouter();
  const [bulkKind, setBulkKind] = useState<MovementKind | null>(null);
  const closeBulk = useCallback(() => setBulkKind(null), []);
  const [pending, startTransition] = useTransition();
  const [visible, setVisible] = useState(initialColumns);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectionFor, setSelectionFor] = useState(rows);

  // Selection belongs to the rows on screen: a new page, sort, or filter clears it.
  if (selectionFor !== rows) {
    setSelectionFor(rows);
    setSelected(new Set());
  }

  function navigate(patch: InventoryPatch, replace = false) {
    const href = inventoryHref(query, patch);
    startTransition(() => (replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
  }

  function linkProps(patch: InventoryPatch) {
    return {
      href: inventoryHref(query, patch),
      scroll: false,
      onClick(event: React.MouseEvent<HTMLAnchorElement>) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(patch);
      },
    };
  }

  // The detail page gets the current list state so its prev/next arrows walk the same filtered, sorted list.
  const fromParam = encodeURIComponent(inventoryParams(query, { page: query.page }).toString());

  const selectedTypes = new Set(rows.filter((r) => selected.has(r.id)).map((r) => r.type));
  const bulkType = selectedTypes.size === 1 ? [...selectedTypes][0] : null;
  const bulkKinds: MovementKind[] = bulkType && mutableTypes.includes(bulkType) ? (bulkType === "ATK" ? ["IN", "OUT"] : ["TRANSFER"]) : [];

  const columns = INVENTORY_COLUMNS.filter((c) => visible.includes(c.key));
  const activeFilters = activeFilterKeys(query);
  const filtered = activeFilters.length > 0 || Boolean(query.q);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selected.has(r.id));
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(query.page * query.pageSize, total);

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Toolbar: table state on the left, table tools on the right (InvenTree layout). */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-h-9 items-center gap-2 text-sm" aria-live="polite">
          {selected.size > 0 ? (
            <>
              <span className="font-semibold tabular-nums text-fg">{selected.size} dipilih</span>
              <button type="button" onClick={() => setSelected(new Set())} className="font-medium text-accent hover:underline">
                Batalkan pilihan
              </button>
              {bulkKinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setBulkKind(k)}
                  className="inline-flex h-9 items-center rounded-md border border-border-strong bg-surface px-3 font-semibold text-fg hover:bg-surface-sunken"
                >
                  {MOVEMENT_TITLES[k]}
                </button>
              ))}
              {selectedTypes.size > 1 && <span className="text-muted">Pilih satu tipe (BMN atau ATK) untuk aksi massal.</span>}
            </>
          ) : (
            <span className="tabular-nums text-muted">
              {total.toLocaleString("id-ID")} barang{filtered ? " cocok" : ""}
            </span>
          )}
          {pending && <span className="text-muted">· Memuat…</span>}
        </div>

        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SearchBox query={query} onSearch={(q) => navigate({ q }, true)} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={toolButton}
              aria-label="Muat ulang data"
              title="Muat ulang data"
              onClick={() => startTransition(() => router.refresh())}
            >
              <RefreshIcon className={`size-4 ${pending ? "animate-spin motion-reduce:animate-none" : ""}`} />
            </button>
            <ColumnMenu
              visible={visible}
              buttonClassName={toolButton}
              onChange={(keys) => {
                setVisible(keys);
                saveVisibleColumns(keys);
              }}
            />
            <SavedFilters
              query={query}
              buttonClassName={toolButton}
              onApply={(href) => startTransition(() => router.push(href, { scroll: false }))}
            />
            <FilterDrawer query={query} options={options} customFilters={customFilters} buttonClassName={toolButton} onApply={(patch) => navigate(patch)} />
            <ExportMenu query={query} total={total} selectedIds={[...selected]} buttonClassName={toolButton} />
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2" aria-label="Filter aktif">
          {activeFilters.map((key) => (
            <li key={key}>
              <span className="inline-flex items-center gap-1 rounded bg-accent-soft py-0.5 pl-2 pr-0.5 text-xs text-accent">
                <span>
                  {FILTER_LABELS[key]}: <span className="font-semibold">{filterValueLabel(key, query, options)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate({ [key]: undefined })}
                  className="inline-flex size-6 items-center justify-center rounded hover:bg-surface"
                  aria-label={`Hapus filter ${FILTER_LABELS[key]}`}
                >
                  <CloseIcon className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => navigate(clearFiltersPatch())} className="px-1.5 text-xs font-medium text-danger hover:underline">
              Hapus semua filter
            </button>
          </li>
        </ul>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-[13px]" aria-busy={pending}>
          <caption className="sr-only">
            Daftar inventaris, {first} sampai {last} dari {total}. Klik judul kolom untuk mengurutkan.
          </caption>
          <thead className="border-b border-border bg-surface-sunken text-xs text-fg-secondary">
            <tr>
              <th scope="col" className="w-10 px-1.5 py-1">
                <SelectAllCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={rows.length === 0}
                  onChange={(checked) => setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </th>
              {columns.map((column) => {
                const sorted = "sort" in column && query.sort === column.sort ? query.dir : undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className="whitespace-nowrap px-2 py-1 font-semibold"
                  >
                    <div className={`flex items-center gap-0.5 ${"align" in column ? "justify-end" : ""}`}>
                      {"sort" in column ? (
                        <Link
                          {...linkProps({
                            sort: column.sort,
                            dir: sorted === "asc" ? "desc" : "asc",
                          })}
                          className={`inline-flex min-h-8 items-center gap-1 rounded px-1 hover:text-fg ${sorted ? "text-fg" : ""}`}
                        >
                          {column.label}
                          <SortIcon dir={sorted} />
                          <span className="sr-only">
                            {sorted === "asc" ? ", urut naik; klik untuk urut turun" : ", klik untuk mengurutkan"}
                          </span>
                        </Link>
                      ) : (
                        <span className="px-1">{column.label}</span>
                      )}
                      {"filter" in column && (
                        <ColumnFilter
                          kind={column.filter}
                          columnLabel={column.label}
                          query={query}
                          options={options}
                          onApply={(patch) => navigate(patch)}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
              {customColumns.map((c) => (
                <th key={c.id} scope="col" className="whitespace-nowrap px-2 py-1 font-semibold">
                  <span className="px-1">{c.label}</span>
                </th>
              ))}
              <th scope="col" className="w-12 px-2 py-1">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-border transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + customColumns.length + 2} className="px-5 py-12 text-center">
                  {filtered ? (
                    <>
                      <p className="font-semibold text-fg">Tidak ada barang yang cocok.</p>
                      <p className="mt-1 text-sm text-muted">
                        Ubah kata kunci atau{" "}
                        <button
                          type="button"
                          className="font-medium text-accent hover:underline"
                          onClick={() => navigate({ ...clearFiltersPatch(), q: undefined })}
                        >
                          hapus semua filter dan pencarian
                        </button>
                        .
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-fg">Belum ada barang inventaris.</p>
                      <p className="mt-1 text-sm text-muted">Barang BMN dan ATK akan tampil di sini setelah ditambahkan.</p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors duration-150 ${isSelected ? "bg-accent-soft/50" : "hover:bg-surface-sunken/60"}`}
                  >
                    <td className="px-1.5 py-1">
                      <label className="flex size-8 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-accent"
                          checked={isSelected}
                          onChange={(event) => {
                            const next = new Set(selected);
                            if (event.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            setSelected(next);
                          }}
                        />
                        <span className="sr-only">Pilih {row.name}</span>
                      </label>
                    </td>
                    {columns.map((column) => (
                      <Cell key={column.key} column={column.key} row={row} href={`/inventory/${row.id}?from=${fromParam}`} />
                    ))}
                    {customColumns.map((c) => (
                      <td key={c.id} className="min-w-24 px-2 py-1 text-fg">
                        {row.custom[c.id] || <span className="text-muted">—</span>}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right">
                      <RowActions label={`${row.code} ${row.name}`}>
                        <MenuLink href={`/inventory/${row.id}?from=${fromParam}`}>Lihat detail</MenuLink>
                        {mutableTypes.includes(row.type) && <MenuLink href={`/inventory/${row.id}/edit`}>Ubah data</MenuLink>}
                      </RowActions>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        label="Halaman inventaris"
        page={query.page}
        pageCount={pageCount}
        pageSize={query.pageSize}
        total={total}
        linkProps={(page) => linkProps({ page })}
        className="border-t border-border px-3 py-2.5"
        extra={
          <label className="flex items-center gap-2 text-muted">
            Baris
            <select
              value={query.pageSize}
              onChange={(event) => navigate({ pageSize: Number(event.target.value) as (typeof INVENTORY_PAGE_SIZES)[number] })}
              className="h-8 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
            >
              {INVENTORY_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        }
      />
      {bulkKind && (
        <MovementDialog
          kind={bulkKind}
          itemIds={rows.filter((r) => selected.has(r.id)).map((r) => r.id)}
          itemLabel={`${selected.size} barang ${bulkType ?? ""} dipilih`}
          options={options}
          onClose={closeBulk}
        />
      )}
    </div>
  );
}

function Cell({ column, row, href }: { column: InventoryColumnKey; row: InventoryRow; href: string }) {
  const muted = <span className="text-muted">—</span>;
  const base = "px-2.5 py-2 align-middle";
  switch (column) {
    case "code":
      return (
        <td className={`${base} whitespace-nowrap font-mono text-xs`}>
          <Link href={href} className="text-accent underline-offset-2 hover:underline">
            {row.code}
          </Link>
        </td>
      );
    case "name":
      return (
        <td className={`${base} min-w-40`}>
          <Link href={href} className="font-medium text-fg hover:underline">
            {row.name}
          </Link>
          {row.detail && <p className="text-xs text-muted">{row.detail}</p>}
        </td>
      );
    case "type":
      return (
        <td className={base}>
          <TypeBadge type={row.type} />
        </td>
      );
    case "category":
      return <td className={`${base} min-w-24 text-fg`}>{row.categoryName ?? muted}</td>;
    case "location":
      return <td className={`${base} min-w-24 text-fg`}>{row.locationName ?? muted}</td>;
    case "pic":
      return <td className={`${base} min-w-24 text-fg`}>{row.picName ?? muted}</td>;
    case "quantity":
      return (
        <td className={`${base} whitespace-nowrap text-right tabular-nums`}>
          <span className={`font-semibold ${row.lowStock ? "text-danger" : "text-fg"}`}>{row.quantityLabel}</span>
          {row.unit && <span className="text-muted"> {row.unit}</span>}
          {row.lowStock && <span className="block text-[11px] font-medium text-danger">Perlu diisi ulang</span>}
        </td>
      );
    case "status":
      return (
        <td className={base}>
          <StatusBadge status={row.status} />
        </td>
      );
    case "condition":
      return <td className={`${base} whitespace-nowrap text-fg`}>{ITEM_CONDITION_LABELS[row.condition]}</td>;
    case "serialNumber":
      return <td className={`${base} whitespace-nowrap font-mono text-xs text-fg`}>{row.serialNumber ?? muted}</td>;
    case "acquisitionDate":
      return <td className={`${base} whitespace-nowrap tabular-nums text-fg`}>{row.acquisitionDateLabel ?? muted}</td>;
    case "kodeBarang":
      return <td className={`${base} whitespace-nowrap font-mono text-xs text-fg`}>{row.kodeBarang ?? muted}</td>;
    case "nup":
      return <td className={`${base} whitespace-nowrap text-right tabular-nums text-fg`}>{row.nup ?? muted}</td>;
    case "brand":
      return <td className={`${base} min-w-28 text-fg`}>{row.brand ?? muted}</td>;
    case "satker":
      return <td className={`${base} whitespace-nowrap font-mono text-xs text-fg`}>{row.satker ?? muted}</td>;
    case "nilaiPerolehan":
      return <td className={`${base} whitespace-nowrap text-right tabular-nums text-fg`}>{row.nilaiPerolehanLabel ?? muted}</td>;
    case "nilaiBuku":
      return <td className={`${base} whitespace-nowrap text-right tabular-nums text-fg`}>{row.nilaiBukuLabel ?? muted}</td>;
    case "statusPenggunaan":
      return <td className={`${base} min-w-40 text-fg`}>{row.statusPenggunaan ?? muted}</td>;
    case "createdAt":
      return <td className={`${base} whitespace-nowrap tabular-nums text-muted`}>{row.createdAtLabel}</td>;
  }
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="flex size-8 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        className="size-4 accent-accent"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="sr-only">Pilih semua baris di halaman ini</span>
    </label>
  );
}

/** Search input that follows the URL but debounces typing into navigation. */
function SearchBox({ query, onSearch }: { query: InventoryListQuery; onSearch: (q: string | undefined) => void }) {
  const [value, setValue] = useState(query.q ?? "");
  const [syncedQ, setSyncedQ] = useState(query.q);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The URL changed from elsewhere (e.g. "hapus semua"): show its value. Not while the user is typing here:
  // the URL then trails the box by one server round trip, and copying it back would erase the latest keystrokes.
  if (syncedQ !== query.q) {
    setSyncedQ(query.q);
    if (!focused) setValue(query.q ?? "");
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function submit(next: string) {
    clearTimeout(timer.current);
    const q = next.trim() || undefined;
    if (q !== query.q) onSearch(q);
  }

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1 sm:w-64 sm:flex-none"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <label htmlFor="inventory-search" className="sr-only">
        Cari barang
      </label>
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        id="inventory-search"
        type="search"
        value={value}
        maxLength={100}
        placeholder="Cari nama, kode, no. seri, PIC…"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => submit(next), SEARCH_DELAY_MS);
        }}
        className="block h-9 w-full rounded-md border border-border-strong bg-surface pl-8 pr-2.5 text-sm text-fg placeholder:text-muted"
      />
    </form>
  );
}

