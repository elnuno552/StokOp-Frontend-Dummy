import { z } from "zod";

// bcrypt only uses the first 72 bytes of a password.
const BCRYPT_MAX_BYTES = 72;
/** Shortest password accepted when nothing is configured; the real value is a setting (lib/settings). */
export const PASSWORD_MIN_LENGTH = 8;

/** Treat empty form fields as "not provided". */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const name = z
  .string({ error: "Nama wajib diisi." })
  .trim()
  .min(1, "Nama wajib diisi.")
  .max(150, "Nama maksimal 150 karakter.");

const username = z
  .string({ error: "Username wajib diisi." })
  .trim()
  .toLowerCase()
  .min(1, "Username wajib diisi.")
  .min(3, "Username minimal 3 karakter.")
  .max(100, "Username maksimal 100 karakter.")
  .regex(/^[a-z0-9._-]+$/, "Gunakan huruf, angka, titik, garis bawah, atau tanda hubung.");

const email = z
  .string({ error: "Email wajib diisi." })
  .trim()
  .toLowerCase()
  .min(1, "Email wajib diisi.")
  .max(255, "Email maksimal 255 karakter.")
  .pipe(z.email("Format email tidak valid."));

// Roles are data now: the service checks the name exists (and that the actor may hand it out).
const role = z.string({ error: "Pilih peran." }).trim().min(1, "Pilih peran.").max(50, "Peran tidak valid.");

/** A password that is at least `minLength` characters and fits bcrypt's 72-byte limit. */
export function makePasswordSchema(minLength: number = PASSWORD_MIN_LENGTH) {
  return z
    .string()
    .min(minLength, `Kata sandi minimal ${minLength} karakter.`)
    .refine(
      (value) => new TextEncoder().encode(value).length <= BCRYPT_MAX_BYTES,
      "Kata sandi terlalu panjang (maksimal 72 byte).",
    );
}

const passwordConfirmation = { message: "Konfirmasi kata sandi tidak sama.", path: ["passwordConfirm"] };

/** Create/update schemas for a given minimum password length (a setting, so it is read per request). */
export function makeUserSchemas(passwordMinLength: number = PASSWORD_MIN_LENGTH) {
  const password = makePasswordSchema(passwordMinLength);

  const createUserSchema = z
    .object({
      name,
      username,
      email,
      role,
      password: z.preprocess(emptyToUndefined, password.optional()).refine((v) => v !== undefined, {
        message: "Kata sandi wajib diisi.",
      }),
      passwordConfirm: z.preprocess(emptyToUndefined, z.string().optional()),
    })
    .refine((data) => data.password === data.passwordConfirm, passwordConfirmation)
    .transform(({ name, username, email, role, password }) => ({ name, username, email, role, password: password! }));

  const updateUserSchema = z
    .object({
      name,
      username,
      email,
      role,
      // Optional on edit: blank keeps the current password.
      password: z.preprocess(emptyToUndefined, password.optional()),
      passwordConfirm: z.preprocess(emptyToUndefined, z.string().optional()),
    })
    .refine((data) => data.password === data.passwordConfirm, passwordConfirmation)
    .transform(({ name, username, email, role, password }) => ({ name, username, email, role, password }));

  return { createUserSchema, updateUserSchema };
}

export type CreateUserInput = z.output<ReturnType<typeof makeUserSchemas>["createUserSchema"]>;
export type UpdateUserInput = z.output<ReturnType<typeof makeUserSchemas>["updateUserSchema"]>;

export const USER_PAGE_SIZES = [10, 20] as const;

/** List query from the URL. Invalid values fall back to defaults instead of erroring. */
export const userListQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()).catch(undefined),
  role: z.preprocess(emptyToUndefined, role.optional()).catch(undefined),
  status: z.preprocess(emptyToUndefined, z.enum(["active", "inactive"]).optional()).catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n): n is (typeof USER_PAGE_SIZES)[number] => (USER_PAGE_SIZES as readonly number[]).includes(n))
    .catch(10),
});

export type UserListQuery = z.output<typeof userListQuerySchema>;

/** Change-own-password form: the current password plus a new one entered twice. */
export function makeChangePasswordSchema(passwordMinLength: number = PASSWORD_MIN_LENGTH) {
  return z
    .object({
      currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi.").max(200),
      password: makePasswordSchema(passwordMinLength),
      passwordConfirm: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirm, passwordConfirmation)
    .refine((data) => data.password !== data.currentPassword, { message: "Kata sandi baru harus berbeda dari yang sekarang.", path: ["password"] });
}
