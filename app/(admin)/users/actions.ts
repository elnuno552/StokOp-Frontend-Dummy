"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireCapability, type AuthContext } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { createUser, setUserActive, updateUser } from "@/lib/users/service";
import { getAppSettings } from "@/lib/settings/service";
import { makeUserSchemas } from "@/validations/user";

export type UserFormValues = { name: string; username: string; email: string; role: string };

export interface UserFormState {
  error?: string;
  fieldErrors?: Partial<Record<keyof UserFormValues | "password" | "passwordConfirm", string>>;
  /** Submitted values (never passwords), so the form can be re-rendered after an error. */
  values?: UserFormValues;
  /** Changes on every failed submit to remount the form with `values`. */
  attempt?: number;
}

const FORBIDDEN_MESSAGE = "Peran Anda tidak diizinkan mengelola pengguna.";

// Server actions are public endpoints: authorize on every call.
async function authorize(): Promise<AuthContext | UserFormState> {
  try {
    return await requireCapability("manage_users");
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) return { error: FORBIDDEN_MESSAGE };
    throw error;
  }
}

function readValues(formData: FormData): UserFormValues {
  const get = (key: string) => String(formData.get(key) ?? "");
  return { name: get("name"), username: get("username"), email: get("email"), role: get("role") };
}

function firstErrors(error: z.ZodError): UserFormState["fieldErrors"] {
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
  }
  return fieldErrors;
}

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await authorize();
  if (!("id" in actor)) return actor;

  const values = readValues(formData);
  const { createUserSchema } = makeUserSchemas((await getAppSettings()).passwordMinLength);
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values, attempt: Date.now() };

  const result = await createUser(actor, parsed.data, await currentRequestIp());
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, values, attempt: Date.now() };

  revalidatePath("/users");
  redirect(`/users?notice=created&u=${encodeURIComponent(parsed.data.username)}`);
}

export async function updateUserAction(
  userId: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await authorize();
  if (!("id" in actor)) return actor;

  const values = readValues(formData);
  const { updateUserSchema } = makeUserSchemas((await getAppSettings()).passwordMinLength);
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values, attempt: Date.now() };

  const result = await updateUser(actor, userId, parsed.data, await currentRequestIp());
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, values, attempt: Date.now() };

  revalidatePath("/users");
  redirect(`/users/${userId}/edit?notice=${result.changed ? "updated" : "unchanged"}`);
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const actor = await authorize();
  if (!("id" in actor)) redirect(`/users/${userId}/edit?notice=forbidden`);

  const result = await setUserActive(actor, userId, isActive, await currentRequestIp());
  if (!result.ok) redirect(`/users/${userId}/edit?notice=${userId === actor.id ? "self-status" : "status-error"}`);

  revalidatePath("/users");
  redirect(`/users/${userId}/edit?notice=${isActive ? "activated" : "deactivated"}`);
}
