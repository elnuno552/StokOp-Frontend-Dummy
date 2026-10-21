"use client";

import { useRef } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonDanger, buttonPrimary, buttonSecondary } from "@/components/ui/styles";

interface UserStatusControlProps {
  userName: string;
  isActive: boolean;
  /** Bound server action that applies the opposite of `isActive`. */
  action: () => Promise<void>;
  /** When set, the status cannot be changed and this explains why. */
  lockedReason?: string;
}

export function UserStatusControl({ userName, isActive, action, lockedReason }: UserStatusControlProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (lockedReason) return <p className="text-sm text-muted">{lockedReason}</p>;

  if (!isActive) {
    // Reactivating is safe and reversible: no confirmation step.
    return (
      <form action={action}>
        <SubmitButton pendingLabel="Mengaktifkan…" className={buttonPrimary}>
          Aktifkan kembali
        </SubmitButton>
      </form>
    );
  }

  return (
    <>
      <button type="button" className={buttonDanger} onClick={() => dialogRef.current?.showModal()}>
        Nonaktifkan akun
      </button>

      {/* Native <dialog>: focus trap and Escape-to-close are built in. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="deactivate-title"
        aria-describedby="deactivate-desc"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[10px] border border-border bg-surface p-6 text-fg shadow-xl backdrop:bg-black/50"
      >
        <h2 id="deactivate-title" className="text-lg font-semibold">
          Nonaktifkan {userName}?
        </h2>
        <p id="deactivate-desc" className="mt-2 text-sm text-muted">
          Pengguna tidak dapat masuk, dan sesi yang sedang berjalan langsung berakhir. Akun dapat diaktifkan kembali kapan saja.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={buttonSecondary} onClick={() => dialogRef.current?.close()}>
            Batal
          </button>
          <form action={action}>
            <SubmitButton pendingLabel="Menonaktifkan…" className={`${buttonDanger} w-full`}>
              Ya, nonaktifkan
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
