"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type Position = { top: number; left?: number; right?: number };

/**
 * Button + floating panel. The panel is position: fixed so it is never clipped
 * by the table's horizontal scroll container. It follows the button on scroll
 * and resize, and closes on Escape (focus returns to the button) or outside click.
 * When the button scrolls off screen the panel stays on screen, pinned to the nearest
 * visible edge, so it never disappears while the user is still working in it.
 */

// Space kept clear above the panel: the sticky topbar (h-14) plus a small gap.
const TOP_INSET = 64;
const EDGE = 8;
export function Popover({
  label,
  buttonClassName,
  buttonContent,
  title,
  align = "start",
  panelClassName = "w-72",
  children,
}: {
  /** Accessible name of the button and the panel. */
  label: string;
  buttonClassName: string;
  buttonContent: React.ReactNode;
  /** Tooltip for icon-only buttons. */
  title?: string;
  align?: "start" | "end";
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const buttonId = useId();
  const open = position !== null;

  // Looks the button up by id (not the ref) because `close` is handed to children during render.
  const close = useCallback(
    (restoreFocus = true) => {
      setPosition(null);
      if (restoreFocus) document.getElementById(buttonId)?.focus();
    },
    [buttonId],
  );

  /** Panel position under the button, kept inside the visible area even when the button is not. */
  const measure = useCallback((): Position | null => {
    const button = buttonRef.current;
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const width = panelRef.current?.offsetWidth ?? 288;
    const height = panelRef.current?.offsetHeight ?? 0;
    const top = Math.min(Math.max(rect.bottom + 6, TOP_INSET), Math.max(TOP_INSET, window.innerHeight - EDGE - height));
    const maxLeft = Math.max(EDGE, window.innerWidth - EDGE - width);
    return align === "end"
      ? { top, right: Math.min(Math.max(EDGE, window.innerWidth - rect.right), maxLeft) }
      : { top, left: Math.min(Math.max(EDGE, rect.left), maxLeft) };
  }, [align]);

  function toggle() {
    if (open) return close();
    setPosition(measure());
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input, select, button, [href]")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    }
    // Follow the button when the page or the table scrolls, staying on screen once it leaves.
    function onScroll(event: Event) {
      if (panelRef.current?.contains(event.target as Node)) return;
      const next = measure();
      if (next) setPosition(next);
    }
    const onResize = onScroll;

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close, measure]);

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-label={label}
        title={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {position && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          style={position}
          className={`fixed z-30 max-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-[10px] border border-border bg-surface p-3 text-sm text-fg shadow-lg ${panelClassName}`}
        >
          {children(close)}
        </div>
      )}
    </>
  );
}
