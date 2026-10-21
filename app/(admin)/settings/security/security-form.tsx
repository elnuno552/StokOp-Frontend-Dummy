"use client";

import { useActionState } from "react";
import { hint, input, label, panel } from "@/components/ui/styles";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "@/components/ui/toast";
import {
  LOCK_MINUTES_MAX,
  LOCK_MINUTES_MIN,
  MAX_FAILED_ATTEMPTS_MAX,
  MAX_FAILED_ATTEMPTS_MIN,
  PASSWORD_MIN_LENGTH_MAX,
  PASSWORD_MIN_LENGTH_MIN,
  type AppSettings,
} from "@/lib/settings/defaults";
import { saveSecurityAction, type SecurityState } from "./actions";

type Props = Pick<AppSettings, "maxFailedAttempts" | "lockMinutes" | "passwordMinLength">;

/** Wraps the server action so a successful save also raises a toast. */
async function saveAndToast(prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const state = await saveSecurityAction(prev, formData);
  if (state.saved) toast("Pengaturan keamanan disimpan.");
  return state;
}

export function SecurityForm({ settings }: { settings: Props }) {
  const [state, action] = useActionState<SecurityState, FormData>(saveAndToast, {});

  return (
    <form action={action} key={state.saved ?? "initial"} className="flex max-w-xl flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}

      <fieldset className={`${panel} flex flex-col gap-4 p-5`}>
        <legend className="px-1 text-base font-semibold text-fg">Penguncian akun</legend>
        <p className="text-sm text-muted">
          Setelah salah kata sandi berturut-turut sebanyak batas di bawah, akun tidak bisa masuk untuk sementara. Pengguna tetap melihat pesan salah yang sama, agar keberadaan akun tidak terungkap. Super Admin dapat membukanya lebih cepat dengan mengatur ulang kata sandi.
        </p>
        <div>
          <label htmlFor="maxFailedAttempts" className={label}>
            Salah kata sandi berturut-turut sebelum dikunci
          </label>
          <input id="maxFailedAttempts" name="maxFailedAttempts" type="number" min={MAX_FAILED_ATTEMPTS_MIN} max={MAX_FAILED_ATTEMPTS_MAX} defaultValue={settings.maxFailedAttempts} required className={`${input} mt-1 max-w-32`} />
          <p className={hint}>
            {MAX_FAILED_ATTEMPTS_MIN} sampai {MAX_FAILED_ATTEMPTS_MAX} kali.
          </p>
        </div>
        <div>
          <label htmlFor="lockMinutes" className={label}>
            Lama akun dikunci (menit)
          </label>
          <input id="lockMinutes" name="lockMinutes" type="number" min={LOCK_MINUTES_MIN} max={LOCK_MINUTES_MAX} defaultValue={settings.lockMinutes} required className={`${input} mt-1 max-w-32`} />
          <p className={hint}>
            {LOCK_MINUTES_MIN} sampai {LOCK_MINUTES_MAX} menit.
          </p>
        </div>
      </fieldset>

      <fieldset className={`${panel} flex flex-col gap-4 p-5`}>
        <legend className="px-1 text-base font-semibold text-fg">Kata sandi</legend>
        <div>
          <label htmlFor="passwordMinLength" className={label}>
            Panjang minimal kata sandi
          </label>
          <input id="passwordMinLength" name="passwordMinLength" type="number" min={PASSWORD_MIN_LENGTH_MIN} max={PASSWORD_MIN_LENGTH_MAX} defaultValue={settings.passwordMinLength} required className={`${input} mt-1 max-w-32`} />
          <p className={hint}>Berlaku untuk kata sandi baru dan hasil pengaturan ulang. Kata sandi yang sudah ada tidak berubah.</p>
        </div>
      </fieldset>

      <div>
        <SubmitButton pendingLabel="Menyimpan…">Simpan pengaturan</SubmitButton>
      </div>
    </form>
  );
}
