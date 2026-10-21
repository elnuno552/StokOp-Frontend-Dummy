"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Short feedback after an action (DESIGN.md §26). Errors and anything the user must not miss stay in the page or
// dialog instead; toasts here pause while hovered or focused and can be closed.

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const EVENT = "app-toast";
let nextId = 1;
// Toasts raised before the Toaster listens (child effects run before the layout's) wait here.
const pending: ToastItem[] = [];
let listening = false;

export function toast(message: string, tone: ToastTone = "success") {
  const item = { id: nextId++, message, tone };
  if (!listening) pending.push(item);
  else window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: item }));
}

const DURATION: Record<ToastTone, number> = { success: 6000, info: 6000, warning: 9000, error: 10000 };

const TONE: Record<ToastTone, { box: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }> = {
  success: { box: "border-success-border bg-success-soft text-success", icon: CircleCheck },
  info: { box: "border-info-border bg-info-soft text-info", icon: Info },
  warning: { box: "border-warning-border bg-warning-soft text-warning", icon: TriangleAlert },
  error: { box: "border-danger-border bg-danger-soft text-danger", icon: CircleAlert },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onClose(item.id), DURATION[item.tone]);
    return () => clearTimeout(timer);
  }, [paused, item, onClose]);

  const { box, icon: Icon } = TONE[item.tone];
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`flex w-[min(24rem,calc(100vw-2rem))] items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium shadow-md ${box}`}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1">{item.message}</p>
      <button type="button" onClick={() => onClose(item.id)} aria-label="Tutup pemberitahuan" className="-m-1 rounded p-1 opacity-70 hover:opacity-100">
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/** Mount once in the layout. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const close = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  useEffect(() => {
    function onToast(event: Event) {
      const item = (event as CustomEvent<ToastItem>).detail;
      setItems((list) => [...list.slice(-3), item]);
    }
    window.addEventListener(EVENT, onToast);
    listening = true;
    // Replay toasts raised before this listener existed.
    const replay = setTimeout(() => {
      for (const item of pending.splice(0)) window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: item }));
    }, 0);
    return () => {
      clearTimeout(replay);
      window.removeEventListener(EVENT, onToast);
      listening = false;
    };
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastCard item={item} onClose={close} />
        </div>
      ))}
    </div>
  );
}

/**
 * Show a toast for a result passed in the URL (e.g. ?created=CODE after a redirect), then drop those parameters so
 * a reload or a shared link does not repeat it.
 */
export function FlashToast({ message, tone = "success", params }: { message: string; tone?: ToastTone; params: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(message, tone);
    const next = new URLSearchParams(searchParams.toString());
    for (const p of params) next.delete(p);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [message, tone, params, pathname, router, searchParams]);

  return null;
}
