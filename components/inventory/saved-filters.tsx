"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { inventoryParams } from "@/lib/inventory/list-query";
import type { InventoryListQuery } from "@/validations/inventory";
import { BookmarkIcon, CloseIcon } from "./icons";
import { Popover } from "./popover";

// Saved views live in this browser only (localStorage): a personal convenience, not shared data.
const STORAGE_KEY = "inventory_saved_filters";
const MAX_SAVED = 10;
const listeners = new Set<() => void>();

interface SavedFilter {
  name: string;
  /** Query string of the saved view (filters, search and sort; never the page). */
  qs: string;
}

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): SavedFilter[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (v): v is SavedFilter => typeof v?.name === "string" && typeof v?.qs === "string",
    );
  } catch {
    return [];
  }
}

function write(list: SavedFilter[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: the view simply is not saved.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function SavedFilters({
  query,
  buttonClassName,
  onApply,
}: {
  query: InventoryListQuery;
  buttonClassName: string;
  onApply: (href: string) => void;
}) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const saved = useMemo(() => parse(raw), [raw]);
  const [name, setName] = useState("");

  const currentQs = inventoryParams(query, { page: 1 }).toString();

  function save() {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    write([{ name: trimmed, qs: currentQs }, ...saved.filter((s) => s.name !== trimmed)].slice(0, MAX_SAVED));
    setName("");
  }

  return (
    <Popover
      label="Tampilan tersimpan"
      title="Tampilan tersimpan"
      align="end"
      panelClassName="w-72"
      buttonClassName={buttonClassName}
      buttonContent={<BookmarkIcon />}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          <p className="font-semibold">Tampilan tersimpan</p>
          {saved.length === 0 ? (
            <p className="text-muted">Belum ada. Atur filter, pencarian, atau urutan, lalu simpan di bawah.</p>
          ) : (
            <ul className="flex flex-col">
              {saved.map((s) => (
                <li key={s.name} className="flex items-center">
                  <button
                    type="button"
                    className="min-h-9 flex-1 truncate rounded px-1.5 text-left hover:bg-surface-sunken"
                    onClick={() => {
                      onApply(s.qs ? `/inventory?${s.qs}` : "/inventory");
                      close();
                    }}
                  >
                    {s.name}
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded text-muted hover:bg-surface-sunken hover:text-danger"
                    aria-label={`Hapus tampilan ${s.name}`}
                    onClick={() => write(saved.filter((x) => x.name !== s.name))}
                  >
                    <CloseIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex gap-2 border-t border-border pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <label htmlFor="saved-filter-name" className="sr-only">
              Nama tampilan
            </label>
            <input
              id="saved-filter-name"
              value={name}
              maxLength={40}
              placeholder="Nama tampilan ini"
              onChange={(event) => setName(event.target.value)}
              className="block h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-fg placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="h-9 rounded-md bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
            >
              Simpan
            </button>
          </form>
        </div>
      )}
    </Popover>
  );
}
