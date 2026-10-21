"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Top bar for small screens with a disclosure menu. Closes on Escape and on navigation. */
export function MobileMenu({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Navigating away closes the menu.
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-surface md:hidden">
      <div className="flex min-h-14 items-center justify-between gap-4 px-4">
        <span className="font-semibold text-fg">{title}</span>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu-panel"
          onClick={() => {
            setOpenedAt(pathname);
            setOpen((value) => !value);
          }}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-fg hover:bg-surface-sunken"
        >
          {open ? "Tutup menu" : "Menu"}
        </button>
      </div>
      <div id="mobile-menu-panel" hidden={!open} className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border px-4 pb-4 pt-3">
        {children}
      </div>
    </div>
  );
}
