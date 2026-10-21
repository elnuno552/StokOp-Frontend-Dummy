"use client";

import { menuTrigger } from "@/components/ui/menu";
import { useState } from "react";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { buttonDanger, buttonPrimary, buttonSecondary, fieldError, hint, input, label } from "@/components/ui/styles";
import { FIELD_TYPES, FIELD_TYPE_LABELS, type FieldType } from "@/lib/custom-fields/rules";
import { archiveFieldAction, deleteFieldAction, moveFieldAction, saveFieldAction } from "./actions";

export interface FieldView {
  id: string;
  categoryId: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
  showInList: boolean;
  filterable: boolean;
  archived: boolean;
  usedBy: number;
}

const small = "min-h-9 px-3";
type Errors = Partial<Record<string, string>>;

function Err({ errors, name }: { errors: Errors; name: string }) {
  return errors[name] ? (
    <p role="alert" className={fieldError}>
      {errors[name]}
    </p>
  ) : null;
}

function FieldFormBody({ categoryId, field, errors }: { categoryId: string; field?: FieldView; errors: Errors }) {
  const [type, setType] = useState<FieldType>(field?.type ?? "TEXT");
  return (
    <>
      <input type="hidden" name="categoryId" value={categoryId} />
      <div>
        <label htmlFor="cf-label" className={label}>
          Nama kolom
        </label>
        <input id="cf-label" name="label" defaultValue={field?.label ?? ""} maxLength={100} required aria-invalid={errors.label ? true : undefined} className={`${input} mt-1`} placeholder="Contoh: Nomor polisi" />
        <Err errors={errors} name="label" />
      </div>
      <div>
        <label htmlFor="cf-type" className={label}>
          Jenis isian
        </label>
        <select id="cf-type" name="type" value={type} onChange={(e) => setType(e.target.value as FieldType)} className={`${input} mt-1`}>
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <Err errors={errors} name="type" />
      </div>
      {type === "SELECT" && (
        <div>
          <label htmlFor="cf-options" className={label}>
            Pilihan (satu per baris)
          </label>
          <textarea id="cf-options" name="optionsText" rows={4} defaultValue={(field?.options ?? []).join("\n")} aria-invalid={errors.optionsText ? true : undefined} className={`${input} mt-1 py-2`} />
          <Err errors={errors} name="optionsText" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2.5 text-sm text-fg">
          <input type="checkbox" name="required" defaultChecked={field?.required} className="size-4 accent-accent" />
          Wajib diisi
        </label>
        <label className="flex items-center gap-2.5 text-sm text-fg">
          <input type="checkbox" name="showInList" defaultChecked={field?.showInList} className="size-4 accent-accent" />
          Tampil sebagai kolom di Inventaris
        </label>
        <label className="flex items-center gap-2.5 text-sm text-fg">
          <input type="checkbox" name="filterable" defaultChecked={field?.filterable} className="size-4 accent-accent" />
          Dapat dipakai sebagai filter
        </label>
        <p className={hint}>Kolom dan filter tampil di Inventaris saat daftar disaring menurut kategori ini.</p>
      </div>
    </>
  );
}

export function FieldFormDialog({ categoryId, field, asMenuItem }: { categoryId: string; field?: FieldView; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel={field ? "Ubah" : "Tambah kolom"}
      triggerClassName={field ? `${buttonSecondary} ${small}` : buttonPrimary}
      title={field ? "Ubah kolom" : "Tambah kolom"}
      action={saveFieldAction.bind(null, field?.id ?? null) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Simpan"
      pendingLabel="Menyimpan…"
      {...menuTrigger(asMenuItem)}
    >
      {(errors) => <FieldFormBody categoryId={categoryId} field={field} errors={errors} />}
    </ActionDialog>
  );
}

export function ArchiveFieldButton({ field, asMenuItem }: { field: FieldView; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel={field.archived ? "Pulihkan" : "Arsipkan"}
      triggerClassName={`${buttonSecondary} ${small}`}
      title={field.archived ? "Pulihkan kolom?" : "Arsipkan kolom?"}
      description={field.archived ? `${field.label} kembali ditanyakan di formulir.` : `${field.label} tidak lagi ditanyakan, tetapi nilai yang sudah diisi tetap tersimpan.`}
      action={() => archiveFieldAction(field.id, !field.archived)}
      submitLabel={field.archived ? "Ya, pulihkan" : "Ya, arsipkan"}
      pendingLabel="Menyimpan…"
      tone="neutral"
      {...menuTrigger(asMenuItem)}
    />
  );
}

export function DeleteFieldButton({ field, asMenuItem }: { field: FieldView; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Hapus"
      triggerClassName={`${buttonDanger} ${small}`}
      title="Hapus kolom?"
      description={`${field.label} dihapus permanen. Hanya bisa bila belum diisi pada barang mana pun.`}
      action={() => deleteFieldAction(field.id)}
      submitLabel="Ya, hapus"
      pendingLabel="Menghapus…"
      tone="danger"
      {...menuTrigger(asMenuItem, true)}
    />
  );
}

export function MoveButtons({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  const [pending, setPending] = useState(false);
  async function move(direction: "up" | "down") {
    setPending(true);
    await moveFieldAction(id, direction);
    setPending(false);
  }
  return (
    <span className="inline-flex gap-1">
      <button type="button" disabled={first || pending} onClick={() => move("up")} aria-label="Naikkan" className={`${buttonSecondary} min-h-9 px-2 disabled:opacity-40`}>
        ↑
      </button>
      <button type="button" disabled={last || pending} onClick={() => move("down")} aria-label="Turunkan" className={`${buttonSecondary} min-h-9 px-2 disabled:opacity-40`}>
        ↓
      </button>
    </span>
  );
}
