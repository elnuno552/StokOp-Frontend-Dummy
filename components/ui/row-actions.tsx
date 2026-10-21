"use client";

import { MoreHorizontal } from "lucide-react";
import { Menu } from "./menu";

/**
 * The "•••" menu at the end of a table row (DESIGN.md §20). Items are MenuLink, MenuSeparator, or any dialog
 * component rendered with `asMenuItem`. Destructive items go last, after a MenuSeparator.
 */
export function RowActions({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Menu
      label={`Aksi untuk ${label}`}
      panelClassName="w-52"
      buttonClassName="inline-flex size-8 items-center justify-center rounded-md text-fg-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-fg aria-expanded:bg-surface-sunken"
      buttonContent={<MoreHorizontal aria-hidden className="size-[18px]" />}
    >
      {children}
    </Menu>
  );
}
