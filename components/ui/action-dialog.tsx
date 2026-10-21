"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SubmitButton } from "./submit-button";
import { buttonDangerSolid, buttonPrimary, buttonSecondary } from "./styles";
import { toast } from "./toast";

export interface DialogState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Set on success (timestamp): the dialog closes. */
  done?: number;
  /** With `done`: keep the dialog open to show this message (e.g. the action was filed for approval). */
  notice?: string;
}

type DialogAction = (prev: DialogState, formData: FormData) => Promise<DialogState>;

interface Props {
  triggerLabel: string;
  title: string;
  description?: React.ReactNode;
  action: DialogAction;
  submitLabel: string;
  pendingLabel: string;
  tone?: "primary" | "danger" | "neutral";
  /** Class for the trigger button; defaults to a secondary button. */
  triggerClassName?: string;
  /** "menuitem" when the trigger sits in a row action menu. */
  triggerRole?: "menuitem";
  /** Icon shown before the trigger label. */
  triggerIcon?: React.ReactNode;
  /** Toast shown when the action succeeds (DESIGN.md §26, §40). */
  successMessage?: string;
  /** Form fields. Receives the server's field errors. */
  children?: (errors: Partial<Record<string, string>>) => React.ReactNode;
}

/**
 * Button that opens a modal form bound to a server action. The form only exists while the dialog is open. The
 * dialog is rendered in a portal, so it keeps working when its trigger lives in a menu that closes.
 */
export function ActionDialog({ triggerLabel, triggerClassName = buttonSecondary, triggerRole, triggerIcon, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" role={triggerRole} tabIndex={triggerRole ? -1 : undefined} className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerIcon}
        {triggerLabel}
      </button>
      {open && createPortal(<DialogBody {...rest} onClose={close} />, document.body)}
    </>
  );
}

function DialogBody({
  title,
  description,
  action,
  submitLabel,
  pendingLabel,
  tone = "primary",
  successMessage = "Perubahan berhasil disimpan.",
  children,
  onClose,
}: Omit<Props, "triggerLabel" | "triggerClassName" | "triggerRole" | "triggerIcon"> & { onClose: () => void }) {
  const [state, formAction] = useActionState<DialogState, FormData>(action, {});
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (state.done && !state.notice) {
      toast(successMessage);
      onClose();
    }
  }, [state.done, state.notice, onClose, successMessage]);

  const errors = state.fieldErrors ?? {};
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[10px] border border-border bg-surface p-0 text-fg shadow-lg backdrop:bg-slate-900/40"
    >
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {state.error && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {state.error}
          </p>
        )}
        {state.done && state.notice ? (
          <>
            <p role="status" className="rounded-md border border-info-border bg-info-soft px-3 py-2 text-sm font-medium text-info">
              {state.notice}
            </p>
            <div className="flex justify-end">
              <button type="button" className={buttonPrimary} onClick={() => ref.current?.close()}>
                Tutup
              </button>
            </div>
          </>
        ) : (
          <>
            {children?.(errors)}
            <div className="flex justify-end gap-2">
              <button type="button" className={buttonSecondary} onClick={() => ref.current?.close()}>
                Batal
              </button>
              <SubmitButton pendingLabel={pendingLabel} className={tone === "danger" ? buttonDangerSolid : buttonPrimary}>
                {submitLabel}
              </SubmitButton>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
