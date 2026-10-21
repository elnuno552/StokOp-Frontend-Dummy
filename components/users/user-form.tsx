"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { UserFormState, UserFormValues } from "@/app/(admin)/users/actions";
import { PasswordInput } from "@/components/ui/password-input";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonSecondary, fieldError, hint, input, label } from "@/components/ui/styles";

type Field = keyof NonNullable<UserFormState["fieldErrors"]>;

const FIELDS_WITH_HINT = new Set<Field>(["username", "email", "role", "password", "passwordConfirm"]);

interface UserFormProps {
  mode: "create" | "edit";
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  roles: { value: string; label: string }[];
  initialValues: UserFormValues;
  /** When set, the role cannot be changed and this explains why. */
  roleLockedReason?: string;
  passwordMinLength: number;
}

export function UserForm({ mode, action, roles, initialValues, roleLockedReason, passwordMinLength }: UserFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? initialValues;
  const errors = state.fieldErrors ?? {};
  const errorCount = Object.keys(errors).length;

  const fieldProps = (field: Field) => ({
    id: field,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby":
      [errors[field] && `${field}-error`, FIELDS_WITH_HINT.has(field) && `${field}-hint`].filter(Boolean).join(" ") ||
      undefined,
  });

  const errorText = (field: Field) =>
    errors[field] ? (
      <p id={`${field}-error`} className={fieldError}>
        {errors[field]}
      </p>
    ) : null;

  return (
    // key: remount after a failed submit so fields show the submitted values again.
    <form key={state.attempt ?? "initial"} action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      {(state.error || errorCount > 0) && (
        <Notice tone="error">
          {state.error ?? `Periksa kembali ${errorCount} isian yang ditandai.`}
        </Notice>
      )}

      <div>
        <label htmlFor="name" className={label}>
          Nama lengkap
        </label>
        <input {...fieldProps("name")} defaultValue={values.name} required maxLength={150} autoComplete="off" className={`${input} mt-1.5`} />
        {errorText("name")}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className={label}>
            Username
          </label>
          <input
            {...fieldProps("username")}
            defaultValue={values.username}
            required
            minLength={3}
            maxLength={100}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`${input} mt-1.5 font-mono`}
          />
          <p id="username-hint" className={hint}>
            Untuk masuk ke sistem. Contoh: budi.santoso
          </p>
          {errorText("username")}
        </div>

        <div>
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input
            {...fieldProps("email")}
            type="email"
            defaultValue={values.email}
            required
            maxLength={255}
            autoComplete="off"
            placeholder="nama@instansi.go.id"
            className={`${input} mt-1.5`}
          />
          <p id="email-hint" className={hint}>
            Bisa dipakai untuk masuk selain username.
          </p>
          {errorText("email")}
        </div>
      </div>

      <div className="sm:max-w-xs">
        <label htmlFor="role" className={label}>
          Peran
        </label>
        {roleLockedReason && <input type="hidden" name="role" value={values.role} />}
        <select
          {...fieldProps("role")}
          name={roleLockedReason ? undefined : "role"}
          defaultValue={values.role}
          disabled={Boolean(roleLockedReason)}
          required
          className={`${input} mt-1.5`}
        >
          {mode === "create" && (
            <option value="" disabled>
              Pilih peran
            </option>
          )}
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <p id="role-hint" className={hint}>
          {roleLockedReason ?? "Menentukan data yang boleh dikelola pengguna ini."}
        </p>
        {errorText("role")}
      </div>

      <fieldset className="flex flex-col gap-6 rounded-lg border border-border p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-fg">
          {mode === "create" ? "Kata sandi awal" : "Atur ulang kata sandi (opsional)"}
        </legend>
        <p className="-mt-3 text-sm text-muted">
          {mode === "create"
            ? `Minimal ${passwordMinLength} karakter. Sampaikan kepada pengguna melalui jalur yang aman.`
            : "Kosongkan kedua isian jika kata sandi tidak diubah."}
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className={label}>
              Kata sandi {mode === "edit" && "baru"}
            </label>
            <PasswordInput
              {...fieldProps("password")}
              required={mode === "create"}
              minLength={passwordMinLength}
              autoComplete="new-password"
            />
            <p id="password-hint" className="sr-only">
              Minimal {passwordMinLength} karakter.
            </p>
            {errorText("password")}
          </div>
          <div>
            <label htmlFor="passwordConfirm" className={label}>
              Ulangi kata sandi
            </label>
            <PasswordInput {...fieldProps("passwordConfirm")} required={mode === "create"} autoComplete="new-password" />
            <p id="passwordConfirm-hint" className="sr-only">
              Harus sama dengan isian kata sandi.
            </p>
            {errorText("passwordConfirm")}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pendingLabel="Menyimpan…">
          {mode === "create" ? "Tambah pengguna" : "Simpan perubahan"}
        </SubmitButton>
        <Link href="/users" className={buttonSecondary}>
          Batal
        </Link>
      </div>
    </form>
  );
}
