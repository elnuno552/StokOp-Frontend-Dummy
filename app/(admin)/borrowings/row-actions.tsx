"use client";

import { menuTrigger } from "@/components/ui/menu";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { buttonDanger, buttonPrimary, buttonSecondary, fieldError, input, label } from "@/components/ui/styles";
import { ReturnDialog } from "../inventory/[id]/workflow-dialogs";
import { approveBorrowingAction, cancelBorrowingAction, rejectBorrowingAction } from "./actions";

const small = "min-h-9 px-3";

export function ApproveButton({ borrowingId, itemName, borrower, asMenuItem }: { borrowingId: string; itemName: string; borrower: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Setujui"
      triggerClassName={`${buttonPrimary} ${small}`}
      title="Setujui peminjaman"
      description={`${itemName} · ${borrower}`}
      action={() => approveBorrowingAction(borrowingId)}
      submitLabel="Setujui"
      pendingLabel="Menyimpan…"
      {...menuTrigger(asMenuItem)}
    />
  );
}

export function RejectButton({ borrowingId, itemName, borrower, asMenuItem }: { borrowingId: string; itemName: string; borrower: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Tolak"
      triggerClassName={`${buttonDanger} ${small}`}
      title="Tolak peminjaman"
      description={`${itemName} · ${borrower}`}
      action={rejectBorrowingAction.bind(null, borrowingId) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Tolak permintaan"
      pendingLabel="Menyimpan…"
      tone="danger"
      {...menuTrigger(asMenuItem, true)}
    >
      {(errors) => (
        <div>
          <label htmlFor="rj-reason" className={label}>
            Alasan penolakan
          </label>
          <textarea id="rj-reason" name="reason" rows={3} maxLength={500} required aria-invalid={errors.reason ? true : undefined} className={`${input} mt-1 py-2`} />
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

export function CancelRequestButton({ borrowingId, itemName, asMenuItem }: { borrowingId: string; itemName: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Batalkan"
      triggerClassName={`${buttonSecondary} ${small}`}
      title="Batalkan permintaan"
      description={`${itemName}. Permintaan ditarik dan tidak diproses.`}
      action={() => cancelBorrowingAction(borrowingId)}
      submitLabel="Batalkan permintaan"
      pendingLabel="Menyimpan…"
      tone="neutral"
      {...menuTrigger(asMenuItem)}
    />
  );
}

export { ReturnDialog };
