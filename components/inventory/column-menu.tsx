"use client";

import { DEFAULT_VISIBLE_COLUMNS, INVENTORY_COLUMNS, type InventoryColumnKey } from "./columns";
import { ColumnsIcon } from "./icons";
import { Popover } from "./popover";

export function ColumnMenu({
  visible,
  buttonClassName,
  onChange,
}: {
  visible: InventoryColumnKey[];
  buttonClassName: string;
  onChange: (keys: InventoryColumnKey[]) => void;
}) {
  const shown = new Set(visible);

  function toggle(key: InventoryColumnKey, checked: boolean) {
    const next = new Set(shown);
    if (checked) next.add(key);
    else next.delete(key);
    // Keep the definition order regardless of click order.
    onChange(INVENTORY_COLUMNS.map((c) => c.key).filter((k) => next.has(k)));
  }

  return (
    <Popover
      label="Pilih kolom"
      title="Pilih kolom"
      align="end"
      panelClassName="w-60"
      buttonClassName={buttonClassName}
      buttonContent={<ColumnsIcon />}
    >
      {() => (
        <fieldset>
          <legend className="mb-2 font-semibold">Kolom yang ditampilkan</legend>
          <ul className="flex flex-col">
            {INVENTORY_COLUMNS.map((column) => {
              const required = "required" in column && column.required;
              return (
                <li key={column.key}>
                  <label
                    className={`flex min-h-9 items-center gap-2.5 rounded px-1.5 ${
                      required ? "text-muted" : "cursor-pointer hover:bg-surface-sunken"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-accent"
                      checked={shown.has(column.key)}
                      disabled={required}
                      onChange={(event) => toggle(column.key, event.target.checked)}
                    />
                    {column.label}
                    {required && <span className="ml-auto text-xs">wajib</span>}
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_VISIBLE_COLUMNS)}
            className="mt-2 w-full rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-sunken"
          >
            Kembalikan default
          </button>
        </fieldset>
      )}
    </Popover>
  );
}
