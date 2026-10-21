"use client";

import { menuTrigger } from "@/components/ui/menu";
import { useState } from "react";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { buttonDanger, buttonPrimary, buttonSecondary, fieldError, input, label } from "@/components/ui/styles";
import { DISPOSAL_REASONS, DISPOSAL_REASON_LABELS } from "@/lib/disposal/rules";
import { ITEM_CONDITION_LABELS } from "@/lib/inventory/labels";
import {
  cancelDisposalAction,
  completeDisposalAction,
  decideDisposalAction,
  markFoundAction,
  markLostAction,
  proposeDisposalAction,
} from "./disposal-actions";

type Errors = Partial<Record<string, string>>;
type Action = (prev: DialogState, fd: FormData) => Promise<DialogState>;

const small = "min-h-9 px-3";

function FieldError({ errors, name }: { errors: Errors; name: string }) {
  return errors[name] ? (
    <p role="alert" className={fieldError}>
      {errors[name]}
    </p>
  ) : null;
}

export function MarkLostDialog({ itemId, itemName }: { itemId: string; itemName: string }) {
  return (
    <ActionDialog
      triggerLabel="Tandai hilang"
      triggerClassName={`${buttonDanger}`}
      title="Tandai barang hilang"
      description={`${itemName}. Status dan kondisi menjadi Hilang. Dapat dibatalkan dengan "Ditemukan kembali".`}
      action={markLostAction.bind(null, itemId) as Action}
      submitLabel="Tandai hilang"
      pendingLabel="Menyimpan…"
      tone="danger"
    >
      {(errors) => (
        <div>
          <label htmlFor="ml-reason" className={label}>
            Keterangan / kronologi
          </label>
          <textarea id="ml-reason" name="reason" rows={3} maxLength={1000} required aria-invalid={errors.reason ? true : undefined} className={`${input} mt-1 py-2`} />
          <FieldError errors={errors} name="reason" />
        </div>
      )}
    </ActionDialog>
  );
}

export function MarkFoundDialog({ itemId, itemName }: { itemId: string; itemName: string }) {
  return (
    <ActionDialog
      triggerLabel="Ditemukan kembali"
      triggerClassName={buttonPrimary}
      title="Barang ditemukan kembali"
      description={`${itemName}. Status kembali menjadi Tersedia.`}
      action={markFoundAction.bind(null, itemId) as Action}
      submitLabel="Simpan"
      pendingLabel="Menyimpan…"
    >
      {(errors) => (
        <>
          <div>
            <label htmlFor="mf-condition" className={label}>
              Kondisi saat ditemukan
            </label>
            <select id="mf-condition" name="condition" defaultValue="GOOD" className={`${input} mt-1`}>
              {(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"] as const).map((c) => (
                <option key={c} value={c}>
                  {ITEM_CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
            <FieldError errors={errors} name="condition" />
          </div>
          <div>
            <label htmlFor="mf-notes" className={label}>
              Catatan (opsional)
            </label>
            <textarea id="mf-notes" name="notes" rows={2} maxLength={500} className={`${input} mt-1 py-2`} />
            <FieldError errors={errors} name="notes" />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function ProposeDisposalDialog({ itemId, itemName, defaultReason }: { itemId: string; itemName: string; defaultReason?: "LOST" }) {
  return (
    <ActionDialog
      triggerLabel="Usulkan penghapusan"
      triggerClassName={buttonSecondary}
      title="Usulkan penghapusan"
      description={`${itemName}. Aset baru berstatus Dihapuskan setelah usulan disetujui dan diselesaikan.`}
      action={proposeDisposalAction.bind(null, itemId) as Action}
      submitLabel="Ajukan usulan"
      pendingLabel="Menyimpan…"
    >
      {(errors) => (
        <>
          <div>
            <label htmlFor="pd-type" className={label}>
              Alasan
            </label>
            <select id="pd-type" name="reasonType" defaultValue={defaultReason ?? "DAMAGED"} className={`${input} mt-1`}>
              {DISPOSAL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {DISPOSAL_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            <FieldError errors={errors} name="reasonType" />
          </div>
          <div>
            <label htmlFor="pd-reason" className={label}>
              Uraian alasan
            </label>
            <textarea id="pd-reason" name="reason" rows={3} maxLength={2000} required aria-invalid={errors.reason ? true : undefined} className={`${input} mt-1 py-2`} />
            <FieldError errors={errors} name="reason" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pd-number" className={label}>
                Nomor usulan (opsional)
              </label>
              <input id="pd-number" name="proposalNumber" maxLength={150} className={`${input} mt-1`} />
              <FieldError errors={errors} name="proposalNumber" />
            </div>
            <div>
              <label htmlFor="pd-date" className={label}>
                Tanggal usulan (opsional)
              </label>
              <input id="pd-date" name="proposalDate" type="date" className={`${input} mt-1`} />
              <FieldError errors={errors} name="proposalDate" />
            </div>
          </div>
        </>
      )}
    </ActionDialog>
  );
}

function DecisionFields({ errors }: { errors: Errors }) {
  const [outcome, setOutcome] = useState<"approve" | "reject">("approve");
  return (
    <>
      <fieldset>
        <legend className={label}>Keputusan</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {(["approve", "reject"] as const).map((o) => (
            <label key={o} className="flex min-h-9 items-center gap-2 text-sm text-fg">
              <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="size-4 accent-accent" />
              {o === "approve" ? "Disetujui" : "Ditolak"}
            </label>
          ))}
        </div>
        <FieldError errors={errors} name="outcome" />
      </fieldset>
      {outcome === "approve" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dd-number" className={label}>
              Nomor keputusan (SK)
            </label>
            <input id="dd-number" name="decisionNumber" maxLength={150} required aria-invalid={errors.decisionNumber ? true : undefined} className={`${input} mt-1`} />
            <FieldError errors={errors} name="decisionNumber" />
          </div>
          <div>
            <label htmlFor="dd-date" className={label}>
              Tanggal keputusan
            </label>
            <input id="dd-date" name="decisionDate" type="date" required aria-invalid={errors.decisionDate ? true : undefined} className={`${input} mt-1`} />
            <FieldError errors={errors} name="decisionDate" />
          </div>
        </div>
      )}
      <div>
        <label htmlFor="dd-notes" className={label}>
          {outcome === "approve" ? "Catatan (opsional)" : "Alasan penolakan"}
        </label>
        <textarea id="dd-notes" name="decisionNotes" rows={2} maxLength={1000} required={outcome === "reject"} aria-invalid={errors.decisionNotes ? true : undefined} className={`${input} mt-1 py-2`} />
        <FieldError errors={errors} name="decisionNotes" />
      </div>
    </>
  );
}

export function DecideDisposalDialog({ itemId, disposalId, itemName, asMenuItem }: { itemId: string; disposalId: string; itemName: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Catat keputusan"
      triggerClassName={`${buttonPrimary} ${small}`}
      title="Catat keputusan"
      description={`${itemName}. Isi nomor dan tanggal keputusan (misalnya dari DJKN).`}
      action={decideDisposalAction.bind(null, itemId, disposalId) as Action}
      submitLabel="Simpan keputusan"
      pendingLabel="Menyimpan…"
      {...menuTrigger(asMenuItem)}
    >
      {(errors) => <DecisionFields errors={errors} />}
    </ActionDialog>
  );
}

export function CompleteDisposalButton({ itemId, disposalId, itemName, asMenuItem }: { itemId: string; disposalId: string; itemName: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Selesaikan penghapusan"
      triggerClassName={`${buttonDanger} ${small}`}
      title="Selesaikan penghapusan"
      description={`${itemName} akan berstatus Dihapuskan dan keluar dari perhitungan aset aktif. Tindakan ini mengikuti keputusan yang sudah dicatat.`}
      action={() => completeDisposalAction(itemId, disposalId)}
      submitLabel="Hapuskan aset"
      pendingLabel="Menyimpan…"
      tone="danger"
      {...menuTrigger(asMenuItem, true)}
    />
  );
}

export function CancelDisposalButton({ itemId, disposalId, itemName, asMenuItem }: { itemId: string; disposalId: string; itemName: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Batalkan usulan"
      triggerClassName={`${buttonSecondary} ${small}`}
      title="Batalkan usulan penghapusan"
      description={`${itemName}. Usulan ditarik; aset tidak berubah.`}
      action={() => cancelDisposalAction(itemId, disposalId)}
      submitLabel="Batalkan usulan"
      pendingLabel="Menyimpan…"
      tone="neutral"
      {...menuTrigger(asMenuItem)}
    />
  );
}
