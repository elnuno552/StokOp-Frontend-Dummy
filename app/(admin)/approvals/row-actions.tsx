"use client";

import { menuTrigger } from "@/components/ui/menu";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { buttonDanger, buttonPrimary, buttonSecondary, fieldError, input, label } from "@/components/ui/styles";
import { approveRequestAction, cancelRequestAction, rejectRequestAction } from "./actions";

const small = "min-h-9 px-3";

export function ApproveRequestButton({ id, summary, asMenuItem }: { id: string; summary: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Setujui"
      triggerClassName={`${buttonPrimary} ${small}`}
      title="Setujui permintaan"
      description={`${summary}. Tindakan dijalankan sekarang dengan data terbaru.`}
      action={() => approveRequestAction(id)}
      submitLabel="Setujui dan jalankan"
      pendingLabel="Memproses…"
      {...menuTrigger(asMenuItem)}
    />
  );
}

export function RejectRequestButton({ id, summary, asMenuItem }: { id: string; summary: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Tolak"
      triggerClassName={`${buttonDanger} ${small}`}
      title="Tolak permintaan"
      description={summary}
      action={rejectRequestAction.bind(null, id) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Tolak permintaan"
      pendingLabel="Menyimpan…"
      tone="danger"
      {...menuTrigger(asMenuItem, true)}
    >
      {(errors) => (
        <div>
          <label htmlFor="ar-reason" className={label}>
            Alasan penolakan
          </label>
          <textarea id="ar-reason" name="reason" rows={3} maxLength={500} required aria-invalid={errors.reason ? true : undefined} className={`${input} mt-1 py-2`} />
          {errors.reason && (
            <p role="alert" className={fieldError}>
              {errors.reason}
            </p>
          )}
        </div>
      )}
    </ActionDialog>
  );
}

export function CancelRequestButton({ id, summary, asMenuItem }: { id: string; summary: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Batalkan"
      triggerClassName={`${buttonSecondary} ${small}`}
      title="Batalkan permintaan"
      description={`${summary}. Permintaan ditarik dan tidak diproses.`}
      action={() => cancelRequestAction(id)}
      submitLabel="Batalkan permintaan"
      pendingLabel="Memproses…"
      tone="neutral"
      {...menuTrigger(asMenuItem)}
    />
  );
}
