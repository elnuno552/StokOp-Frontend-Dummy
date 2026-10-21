"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { getAppSettings } from "@/lib/settings/service";
import { changeOwnPassword } from "@/lib/users/service";
import { makeChangePasswordSchema } from "@/validations/user";

export interface ChangePasswordState {
  error?: string;
  fieldErrors?: Partial<Record<"currentPassword" | "password" | "passwordConfirm", string>>;
  /** Changes on every failed submit so the form remounts (passwords are never echoed back). */
  attempt?: number;
}

function firstErrors(error: z.ZodError): ChangePasswordState["fieldErrors"] {
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
  }
  return fieldErrors;
}

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  let actor;
  try {
    actor = await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }

  const { passwordMinLength } = await getAppSettings();
  const parsed = makeChangePasswordSchema(passwordMinLength).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), attempt: Date.now() };

  const result = await changeOwnPassword(actor, { currentPassword: parsed.data.currentPassword, password: parsed.data.password }, await currentRequestIp());
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, attempt: Date.now() };

  redirect("/account/password?notice=changed");
}
