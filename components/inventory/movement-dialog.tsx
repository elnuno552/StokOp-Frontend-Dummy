"use client";

import { useActionState, useEffect, useRef } from "react";
import { movementAction, type MovementFormState } from "@/app/(admin)/inventory/movement-actions";
import { PicSelect } from "@/components/inventory/pic-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "@/components/ui/toast";
import { buttonSecondary, fieldError, hint, input, label } from "@/components/ui/styles";
import type { InventoryFilterOptions } from "@/lib/inventory/list";
import type { MovementKind } from "@/validations/movement";

export const MOVEMENT_TITLES: Record<MovementKind, string> = {
  IN: "Barang masuk",
  OUT: "Barang keluar",
  ADJUSTMENT: "Penyesuaian stok",
  TRANSFER: "Pindah lokasi / serah terima",
};

const MOVEMENT_SUCCESS: Record<MovementKind, string> = {
  IN: "Barang masuk berhasil dicatat.",
  OUT: "Barang keluar berhasil dicatat.",
  ADJUSTMENT: "Penyesuaian stok berhasil dicatat.",
  TRANSFER: "Pemindahan barang berhasil dicatat.",
};

/**
 * Modal form for one movement applied to one or many items. Mount it only while open;
 * it opens itself on mount and calls onClose after a successful save or when dismissed.
 */
export function MovementDialog({
  kind,
  itemIds,
  itemLabel,
  currentQuantity,
  unit,
  options,
  onClose,
}: {
  kind: MovementKind;
  itemIds: string[];
  /** Shown under the title, e.g. the item name or "12 barang dipilih". */
  itemLabel: string;
  /** System stock, shown for adjustments. */
  currentQuantity?: string;
  unit?: string | null;
  options: Pick<InventoryFilterOptions, "locations" | "pics">;
  onClose: () => void;
}) {
  const [state, action] = useActionState<MovementFormState, FormData>(movementAction, {});
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (state.done && !state.notice) {
      toast(MOVEMENT_SUCCESS[kind]);
      onClose();
    }
  }, [state.done, state.notice, onClose, kind]);

  const errors = state.fieldErrors ?? {};
  const quantityLabel = kind === "ADJUSTMENT" ? "Jumlah sebenarnya (hasil hitung)" : "Jumlah";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="movement-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[10px] border border-border bg-surface p-0 text-fg shadow-lg backdrop:bg-slate-900/40"
    >
      <form action={action} className="flex flex-col gap-4 p-5">
        <div>
          <h2 id="movement-title" className="text-lg font-semibold text-fg">
            {MOVEMENT_TITLES[kind]}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{itemLabel}</p>
        </div>

        <input type="hidden" name="kind" value={kind} />
        {itemIds.map((id) => (
          <input key={id} type="hidden" name="itemId" value={id} />
        ))}

        {state.done && state.notice && (
          <p role="status" className="rounded-md border border-info-border bg-info-soft px-3 py-2 text-sm font-medium text-info">
            {state.notice}
          </p>
        )}
        {state.error && !Object.keys(errors).length && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {state.error}
          </p>
        )}

        {kind !== "TRANSFER" && (
          <div>
            <label htmlFor="mv-quantity" className={label}>
              {quantityLabel}
              {unit ? ` (${unit})` : ""}
            </label>
            <input
              id="mv-quantity"
              name="quantity"
              inputMode="decimal"
              autoComplete="off"
              required
              aria-invalid={errors.quantity ? true : undefined}
              className={`${input} mt-1`}
            />
            {kind === "ADJUSTMENT" && currentQuantity && <p className={hint}>Stok di sistem: {currentQuantity}{unit ? ` ${unit}` : ""}.</p>}
            {errors.quantity && <p role="alert" className={fieldError}>{errors.quantity}</p>}
          </div>
        )}

        {kind === "TRANSFER" && (
          <>
            <div>
              <label htmlFor="mv-location" className={label}>
                Lokasi tujuan
              </label>
              <select id="mv-location" name="toLocationId" defaultValue="" aria-invalid={errors.toLocationId ? true : undefined} className={`${input} mt-1`}>
                <option value="">Tidak berubah</option>
                {options.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {errors.toLocationId && <p role="alert" className={fieldError}>{errors.toLocationId}</p>}
            </div>
            <div>
              <label htmlFor="mv-pic" className={label}>
                PIC baru
              </label>
              <PicSelect
                selectId="mv-pic"
                selectName="toPicId"
                sourceName="toPicSource"
                nameName="toPicName"
                saveName="toPicSave"
                options={options.pics}
                emptyLabel="Tidak berubah"
                noneLabel="Belum ada PIC (kosongkan PIC)"
                scope={itemIds.length > 1 ? "barang yang dipilih" : "barang ini"}
                selectError={errors.toPicId}
                nameError={errors.toPicName}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="mv-description" className={label}>
            {kind === "ADJUSTMENT" ? "Alasan penyesuaian" : "Keterangan (opsional)"}
          </label>
          <textarea
            id="mv-description"
            name="description"
            rows={2}
            maxLength={500}
            required={kind === "ADJUSTMENT"}
            aria-invalid={errors.description ? true : undefined}
            className={`${input} mt-1 py-2`}
          />
          {errors.description && <p role="alert" className={fieldError}>{errors.description}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className={buttonSecondary} onClick={() => ref.current?.close()}>
            {state.done && state.notice ? "Tutup" : "Batal"}
          </button>
          {!(state.done && state.notice) && <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>}
        </div>
      </form>
    </dialog>
  );
}
