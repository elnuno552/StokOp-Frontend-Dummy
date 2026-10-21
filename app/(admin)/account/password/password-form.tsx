"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/ui/notice";
import { PasswordInput } from "@/components/ui/password-input";
import { buttonSecondary, fieldError, hint, label } from "@/components/ui/styles";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePasswordAction, type ChangePasswordState } from "./actions";

export function PasswordForm({ minLength }: { minLength: number }) {
  const [state, action] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});
  const errors = state.fieldErrors ?? {};

  const field = (name: "currentPassword" | "password" | "passwordConfirm") => ({
    id: name,
    name,
    required: true,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const errorText = (name: "currentPassword" | "password" | "passwordConfirm") =>
    errors[name] ? (
      <p id={`${name}-error`} role="alert" className={fieldError}>
        {errors[name]}
      </p>
    ) : null;

  return (
    // key: remount after a failed submit so the fields are cleared and focus state resets.
    <form key={state.attempt ?? "initial"} action={action} noValidate className="flex max-w-md flex-col gap-6">
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <div>
        <label htmlFor="currentPassword" className={label}>
          Kata sandi saat ini
        </label>
        <PasswordInput {...field("currentPassword")} autoComplete="current-password" />
        {errorText("currentPassword")}
      </div>

      <div>
        <label htmlFor="password" className={label}>
          Kata sandi baru
        </label>
        <PasswordInput {...field("password")} minLength={minLength} autoComplete="new-password" />
        <p className={hint}>Minimal {minLength} karakter.</p>
        {errorText("password")}
      </div>

      <div>
        <label htmlFor="passwordConfirm" className={label}>
          Ulangi kata sandi baru
        </label>
        <PasswordInput {...field("passwordConfirm")} autoComplete="new-password" />
        {errorText("passwordConfirm")}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pendingLabel="Menyimpan…">Ubah kata sandi</SubmitButton>
        <Link href="/" className={buttonSecondary}>
          Batal
        </Link>
      </div>
    </form>
  );
}
