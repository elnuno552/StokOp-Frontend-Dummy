"use client";

import { menuTrigger } from "@/components/ui/menu";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { buttonDanger, buttonPrimary, buttonSecondary, fieldError, input, label } from "@/components/ui/styles";
import { EMPLOYEE_LOCATIONS, MASTER_LABELS, type MasterEntity } from "@/validations/master";
import { deleteMasterAction, saveMasterAction } from "./actions";

interface Field {
  name: string;
  label: string;
  required?: boolean;
  kind?: "text" | "textarea" | "select" | "checkbox" | "email";
  options?: { value: string; label: string }[];
  /** Adds a first option with this label and an empty value, so the field can be left unset. */
  emptyLabel?: string;
}

const FIELDS: Record<MasterEntity, Field[]> = {
  locations: [
    { name: "name", label: "Nama lokasi", required: true },
    { name: "building", label: "Gedung" },
    { name: "floor", label: "Lantai" },
    { name: "room", label: "Ruang" },
    { name: "description", label: "Keterangan", kind: "textarea" },
  ],
  categories: [
    { name: "name", label: "Nama kategori", required: true },
    {
      name: "type",
      label: "Tipe",
      required: true,
      kind: "select",
      options: [
        { value: "BMN", label: "BMN" },
        { value: "ATK", label: "ATK" },
      ],
    },
    { name: "description", label: "Keterangan", kind: "textarea" },
  ],
  employees: [
    { name: "name", label: "Nama pegawai", required: true },
    { name: "employeeNumber", label: "NIP / nomor pegawai" },
    { name: "golongan", label: "Golongan" },
    { name: "position", label: "Jabatan" },
    { name: "workLocation", label: "Lokasi", kind: "select", emptyLabel: "Belum ditentukan", options: EMPLOYEE_LOCATIONS.map((value) => ({ value, label: value })) },
    { name: "unit", label: "Unit" },
    { name: "phone", label: "Telepon" },
    { name: "email", label: "Email", kind: "email" },
    { name: "isActive", label: "Pegawai aktif (dapat dipilih sebagai PIC / peminjam)", kind: "checkbox" },
  ],
};

export function MasterFormDialog({
  entity,
  id,
  values,
  allowedTypes,
  asMenuItem,
}: {
  entity: MasterEntity;
  id: string | null;
  values?: Record<string, string>;
  /** Category types this user may manage. */
  allowedTypes?: string[];
  asMenuItem?: boolean;
}) {
  const editing = id !== null;
  const noun = MASTER_LABELS[entity].singular;
  const fields = FIELDS[entity].map((f) =>
    f.name === "type" && allowedTypes ? { ...f, options: f.options?.filter((o) => allowedTypes.includes(o.value)) } : f,
  );

  return (
    <ActionDialog
      triggerLabel={editing ? "Ubah" : `Tambah ${noun}`}
      triggerClassName={editing ? `${buttonSecondary} min-h-9 px-3` : buttonPrimary}
      title={editing ? `Ubah ${noun}` : `Tambah ${noun}`}
      action={saveMasterAction.bind(null, entity, id) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Simpan"
      pendingLabel="Menyimpan…"
      {...menuTrigger(asMenuItem)}
    >
      {(errors) => (
        <>
          {fields.map((f) => {
            const value = values?.[f.name] ?? (f.kind === "checkbox" ? "on" : "");
            const fieldId = `mf-${f.name}`;
            const error = errors[f.name];
            if (f.kind === "checkbox") {
              return (
                <label key={f.name} className="flex items-start gap-2.5 text-sm text-fg">
                  <input type="checkbox" name={f.name} defaultChecked={value === "on"} className="mt-0.5 size-4 accent-accent" />
                  {f.label}
                </label>
              );
            }
            return (
              <div key={f.name}>
                <label htmlFor={fieldId} className={label}>
                  {f.label}
                  {f.required ? "" : " (opsional)"}
                </label>
                {f.kind === "select" ? (
                  <select id={fieldId} name={f.name} defaultValue={value || (f.emptyLabel ? "" : f.options?.[0]?.value)} aria-invalid={error ? true : undefined} className={`${input} mt-1`}>
                    {f.emptyLabel !== undefined && <option value="">{f.emptyLabel}</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.kind === "textarea" ? (
                  <textarea id={fieldId} name={f.name} rows={2} defaultValue={value} aria-invalid={error ? true : undefined} className={`${input} mt-1 py-2`} />
                ) : (
                  <input
                    id={fieldId}
                    name={f.name}
                    type={f.kind === "email" ? "email" : "text"}
                    defaultValue={value}
                    required={f.required}
                    aria-invalid={error ? true : undefined}
                    className={`${input} mt-1`}
                  />
                )}
                {error && (
                  <p role="alert" className={fieldError}>
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </>
      )}
    </ActionDialog>
  );
}

export function MasterDeleteDialog({ entity, id, name, asMenuItem }: { entity: MasterEntity; id: string; name: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Hapus"
      triggerClassName={`${buttonDanger} min-h-9 px-3`}
      title={`Hapus ${MASTER_LABELS[entity].singular}?`}
      description={name}
      action={deleteMasterAction.bind(null, entity, id) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Ya, hapus"
      pendingLabel="Menghapus…"
      tone="danger"
      {...menuTrigger(asMenuItem, true)}
    />
  );
}
