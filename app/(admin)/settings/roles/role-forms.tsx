"use client";

import { useActionState } from "react";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonDanger, buttonPrimary, fieldError, hint, input, label, panel } from "@/components/ui/styles";
import { CAPABILITIES, CAPABILITY_INFO, type Capability } from "@/lib/permissions";
import { createRoleAction, deleteRoleAction, saveRoleAction, type RoleFormState } from "./actions";

export interface RoleView {
  name: string;
  label: string;
  isSystem: boolean;
  capabilities: Capability[];
  userCount: number;
}

export function CreateRoleDialog({ presets }: { presets: { name: string; label: string }[] }) {
  return (
    <ActionDialog
      triggerLabel="Tambah peran"
      triggerClassName={buttonPrimary}
      title="Tambah peran"
      description="Peran baru dapat dipilih saat membuat atau mengubah pengguna. Atur kemampuannya setelah dibuat."
      action={createRoleAction as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Buat peran"
      pendingLabel="Menyimpan…"
    >
      {(errors) => (
        <>
          <div>
            <label htmlFor="nr-label" className={label}>
              Nama peran
            </label>
            <input id="nr-label" name="label" maxLength={60} required aria-invalid={errors.label ? true : undefined} className={`${input} mt-1`} placeholder="Contoh: Kepala Bagian" />
            {errors.label && (
              <p role="alert" className={fieldError}>
                {errors.label}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="nr-copy" className={label}>
              Mulai dari kemampuan peran
            </label>
            <select id="nr-copy" name="copyFrom" defaultValue="" className={`${input} mt-1`}>
              <option value="">Kosong (hanya melihat)</option>
              {presets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function DeleteRoleDialog({ name, labelText }: { name: string; labelText: string }) {
  return (
    <ActionDialog
      triggerLabel="Hapus peran"
      triggerClassName={`${buttonDanger} min-h-9 px-3`}
      title="Hapus peran?"
      description={`${labelText} akan dihapus. Hanya bisa bila tidak ada pengguna yang memakainya.`}
      action={() => deleteRoleAction(name)}
      submitLabel="Ya, hapus"
      pendingLabel="Menghapus…"
      tone="danger"
    />
  );
}

export function RoleCard({ role }: { role: RoleView }) {
  const [state, action] = useActionState<RoleFormState, FormData>(saveRoleAction.bind(null, role.name), {});
  const locked = role.name === "SUPER_ADMIN" || role.name === "HYPER_ADMIN";

  return (
    <form action={action} key={state.saved ?? "initial"} className={`${panel} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`rl-${role.name}`} className={label}>
            Nama peran
          </label>
          <input id={`rl-${role.name}`} name="label" defaultValue={role.label} maxLength={60} required disabled={locked} className={`${input} mt-1 max-w-sm`} />
          <p className={hint}>
            {role.isSystem ? "Peran bawaan" : "Peran kustom"} · <span className="font-mono text-xs">{role.name}</span> · {role.userCount} pengguna
          </p>
        </div>
        {!role.isSystem && role.userCount === 0 && <DeleteRoleDialog name={role.name} labelText={role.label} />}
      </div>

      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state.fieldErrors?.label && (
        <p role="alert" className={fieldError}>
          {state.fieldErrors.label}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-medium text-success">
          Peran disimpan.
        </p>
      )}

      <fieldset className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-fg">Kemampuan</legend>
        {CAPABILITIES.map((cap) => (
          <label key={cap} className="flex items-start gap-2.5 text-sm text-fg">
            <input type="checkbox" name="capabilities" value={cap} defaultChecked={locked || role.capabilities.includes(cap)} disabled={locked} className="mt-0.5 size-4 accent-accent" />
            <span>
              {CAPABILITY_INFO[cap].label}
              <span className="block text-xs text-muted">{CAPABILITY_INFO[cap].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted">Semua peran dapat melihat Beranda, Inventaris, dan Lokasi.{locked ? " Hyper Admin dan Super Admin memiliki kemampuan tetap yang tidak dapat diubah." : ""}</p>

      {!locked && (
        <div>
          <SubmitButton pendingLabel="Menyimpan…">Simpan peran</SubmitButton>
        </div>
      )}
    </form>
  );
}
