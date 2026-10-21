"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "@/lib/navigation";

export const OPEN_PALETTE_EVENT = "open-command-palette";

interface ItemHit {
  id: string;
  code: string;
  name: string;
  type: "BMN" | "ATK";
  locationName: string | null;
}

interface Entry {
  key: string;
  href: string;
  title: string;
  hint: string;
  mono?: boolean;
}

export function CommandPalette({ links }: { links: NavItem[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ q: string; items: ItemHit[] }>({ q: "", items: [] });
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function open() {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, open);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, open);
    };
  }, []);

  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { items: ItemHit[] };
        setHits({ q: trimmed, items: data.items });
        setFailed(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setFailed(true);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const needle = trimmed.toLowerCase();
  const pages: Entry[] = links
    .filter((l) => !needle || l.label.toLowerCase().includes(needle))
    .map((l) => ({ key: `p:${l.href}`, href: l.href, title: l.label, hint: "Halaman" }));
  const items: Entry[] =
    trimmed.length >= 2 && hits.q === trimmed
      ? hits.items.map((i) => ({ key: `i:${i.id}`, href: `/inventory/${i.id}`, title: i.name, hint: `${i.code} · ${i.type}${i.locationName ? ` · ${i.locationName}` : ""}`, mono: true }))
      : [];
  const entries = [...items, ...pages];
  const searching = trimmed.length >= 2 && hits.q !== trimmed && !failed;
  const current = Math.min(active, Math.max(entries.length - 1, 0));

  function go(entry: Entry | undefined) {
    if (!entry) return;
    dialogRef.current?.close();
    router.push(entry.href);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Pencarian cepat"
      onClose={() => {
        setQuery("");
        setActive(0);
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-[10px] border border-border bg-surface p-0 text-fg shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="border-b border-border p-3">
        <label htmlFor={`${listId}-q`} className="sr-only">
          Cari barang atau halaman
        </label>
        <input
          id={`${listId}-q`}
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={entries[current] ? `${listId}-${current}` : undefined}
          placeholder="Cari nama, kode, atau nomor seri barang…"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive(Math.min(current + 1, entries.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive(Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(entries[current]);
            }
          }}
          className="block h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-muted"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Hasil" className="max-h-80 overflow-y-auto p-1.5">
        {entries.map((entry, index) => (
          <li
            key={entry.key}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === current}
            onMouseMove={() => setActive(index)}
            onClick={() => go(entry)}
            className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-3 ${index === current ? "bg-accent-soft" : ""}`}
          >
            <span className="text-sm font-medium text-fg">{entry.title}</span>
            <span className={`text-xs text-muted ${entry.mono ? "font-mono" : ""}`}>{entry.hint}</span>
          </li>
        ))}
        {entries.length === 0 && !searching && <li className="px-3 py-6 text-center text-sm text-muted">{failed ? "Pencarian gagal. Coba lagi." : "Tidak ada hasil."}</li>}
        {searching && <li className="px-3 py-3 text-sm text-muted">Mencari…</li>}
      </ul>
    </dialog>
  );
}
