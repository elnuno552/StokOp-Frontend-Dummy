"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { APPROVAL_KINDS, APPROVAL_KIND_INFO } from "@/lib/approvals/rules";
import { hint, input, label, panel } from "@/components/ui/styles";
import { LOW_STOCK_LIMIT_MAX, LOW_STOCK_LIMIT_MIN, REMINDER_DAYS_MAX, REMINDER_DAYS_MIN, type AppSettings } from "@/lib/settings/defaults";
import { saveSettingsAction, type SettingsState } from "./actions";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action] = useActionState<SettingsState, FormData>(saveSettingsAction, {});

  return (
    <form action={action} key={state.saved ?? "initial"} className="flex max-w-xl flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-medium text-success">
          Pengaturan disimpan.
        </p>
      )}

      <fieldset className={`${panel} flex flex-col gap-3 p-5`}>
        <legend className="px-1 text-base font-semibold text-fg">Pengingat jatuh tempo</legend>
        <div>
          <label htmlFor="reminderDays" className={label}>
            Tampilkan pengingat sekian hari sebelum batas pengembalian
          </label>
          <input
            id="reminderDays"
            name="reminderDays"
            type="number"
            min={REMINDER_DAYS_MIN}
            max={REMINDER_DAYS_MAX}
            defaultValue={settings.reminderDays}
            required
            className={`${input} mt-1 max-w-32`}
          />
          <p className={hint}>Pengingat hanya tampil di sistem (Beranda dan menu Peminjaman). Tidak ada email atau WhatsApp.</p>
        </div>
      </fieldset>

      <fieldset className={`${panel} flex flex-col gap-3 p-5`}>
        <legend className="px-1 text-base font-semibold text-fg">Tindakan yang wajib disetujui</legend>
        <p className="text-sm text-muted">
          Bila dicentang, tindakan oleh peran yang <b>tidak</b> memiliki kemampuan <i>Menyetujui permintaan lain</i> menjadi permintaan di menu Persetujuan dan baru berlaku setelah disetujui. Peran yang memilikinya langsung menjalankan. Peminjaman diatur terpisah lewat kemampuan <i>Menyetujui peminjaman</i>.
        </p>
        {APPROVAL_KINDS.map((kind) => (
          <label key={kind} className="flex items-start gap-2.5 text-sm text-fg">
            <input type="checkbox" name="approvalsRequired" value={kind} defaultChecked={settings.approvalsRequired.includes(kind)} className="mt-0.5 size-4 accent-accent" />
            <span>
              {APPROVAL_KIND_INFO[kind].label}
              <span className="block text-muted">{APPROVAL_KIND_INFO[kind].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className={`${panel} flex flex-col gap-3 p-5`}>
        <legend className="px-1 text-base font-semibold text-fg">Pengingat stok menipis (Beranda)</legend>
        <label className="flex items-start gap-2.5 text-sm text-fg">
          <input type="checkbox" name="lowStockEnabled" defaultChecked={settings.lowStockEnabled} className="mt-0.5 size-4 accent-accent" />
          <span>
            Tampilkan ATK yang pada atau di bawah stok minimum di Beranda
            <span className="block text-muted">Nilai minimum diatur di tab Stok minimum.</span>
          </span>
        </label>
        <div>
          <label htmlFor="lowStockLimit" className={label}>
            Jumlah barang yang ditampilkan di daftar
          </label>
          <input id="lowStockLimit" name="lowStockLimit" type="number" min={LOW_STOCK_LIMIT_MIN} max={LOW_STOCK_LIMIT_MAX} defaultValue={settings.lowStockLimit} required className={`${input} mt-1 max-w-32`} />
        </div>
      </fieldset>

      <div>
        <SubmitButton pendingLabel="Menyimpan…">Simpan pengaturan</SubmitButton>
      </div>
    </form>
  );
}
