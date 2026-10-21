"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Position = { top: number; left?: number; right?: number };

/** Class for anything placed in a menu (links, buttons, dialog triggers). */
const menuItemBase = "flex min-h-10 w-full items-center gap-2 rounded px-3 text-left text-sm transition-colors duration-150";
export const menuItemClass = `${menuItemBase} text-fg hover:bg-surface-sunken focus-visible:bg-surface-sunken`;
export const menuItemDangerClass = `${menuItemBase} text-danger hover:bg-danger-soft focus-visible:bg-danger-soft`;

/**
 * Button with a dropdown menu (DESIGN.md §20). The panel is position: fixed so a scrolling table never clips it.
 * It stays mounted while closed (just hidden) so a confirmation dialog opened from an item keeps living after the
 * menu closes. Escape, Tab and outside clicks close it; arrow keys move between items.
 */
export function Menu({
  label,
  buttonContent,
  buttonClassName,
  align = "end",
  panelClassName = "w-56",
  children,
}: {
  /** Accessible name of the button and the menu. */
  label: string;
  buttonContent: React.ReactNode;
  buttonClassName: string;
  align?: "start" | "end";
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = position !== null;

  const close = useCallback((restoreFocus = true) => {
    setPosition(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const measure = useCallback((): Position | null => {
    const button = buttonRef.current;
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const top = rect.bottom + 4;
    const width = panelRef.current?.offsetWidth ?? 224;
    return align === "end"
      ? { top, right: Math.max(8, window.innerWidth - rect.right) }
      : { top, left: Math.max(8, Math.min(rect.left, window.innerWidth - 8 - width)) };
  }, [align]);

  const items = () => [...(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab") {
        close(false);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const list = items();
        const index = list.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "ArrowDown" ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
        list[next]?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    }
    function onScroll(event: Event) {
      if (!panelRef.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? close() : setPosition(measure()))}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      <div
        ref={panelRef}
        id={menuId}
        role="menu"
        aria-label={label}
        hidden={!open}
        style={position ?? undefined}
        // Choosing an item closes the menu; a dialog it opens lives in a portal and stays open.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('[role="menuitem"]')) close(false);
        }}
        className={`fixed z-30 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-surface p-1 text-sm text-fg shadow-lg ${panelClassName}`}
      >
        {children}
      </div>
    </>
  );
}

export function MenuLink({ href, children, danger }: { href: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Link href={href} role="menuitem" tabIndex={-1} className={danger ? menuItemDangerClass : menuItemClass}>
      {children}
    </Link>
  );
}

export function MenuSeparator() {
  return <hr role="separator" className="-mx-1 my-1 border-border-strong" />;
}

/** Non-interactive text at the top of a menu (e.g. the signed-in user). */
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2">{children}</div>;
}

/** Props that turn an ActionDialog trigger into an item of a row action menu. */
export function menuTrigger(asMenuItem?: boolean, danger = false): { triggerRole?: "menuitem"; triggerClassName?: string } {
  return asMenuItem ? { triggerRole: "menuitem", triggerClassName: danger ? menuItemDangerClass : menuItemClass } : {};
}
