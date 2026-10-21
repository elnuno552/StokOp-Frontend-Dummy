"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireCapability } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import {
  LOCK_MINUTES_MAX,
  LOCK_MINUTES_MIN,
  MAX_FAILED_ATTEMPTS_MAX,
  MAX_FAILED_ATTEMPTS_MIN,
  PASSWORD_MIN_LENGTH_MAX,
  PASSWORD_MIN_LENGTH_MIN,
} from "@/lib/settings/defaults";
import { saveSecuritySettings } from "@/lib/settings/service";

export interface SecurityState {
  error?: string;
  saved?: number;
}

function whole(formData: FormData, name: string): number {
  return Number(String(formData.get(name) ?? "").trim());
}

export async function saveSecurityAction(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  let actor;
  try {
    actor = await requireCapability("manage_settings");
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) return { error: "Peran Anda tidak diizinkan mengubah pengaturan." };
    throw error;
  }

  const maxFailedAttempts = whole(formData, "maxFailedAttempts");
  if (!Number.isInteger(maxFailedAttempts) || maxFailedAttempts < MAX_FAILED_ATTEMPTS_MIN || maxFailedAttempts > MAX_FAILED_ATTEMPTS_MAX) {
    return { error: `Batas salah kata sandi harus bilangan bulat ${MAX_FAILED_ATTEMPTS_MIN} sampai ${MAX_FAILED_ATTEMPTS_MAX}.` };
  }
  const lockMinutes = whole(formData, "lockMinutes");
  if (!Number.isInteger(lockMinutes) || lockMinutes < LOCK_MINUTES_MIN || lockMinutes > LOCK_MINUTES_MAX) {
    return { error: `Lama penguncian harus bilangan bulat ${LOCK_MINUTES_MIN} sampai ${LOCK_MINUTES_MAX} menit.` };
  }
  const passwordMinLength = whole(formData, "passwordMinLength");
  if (!Number.isInteger(passwordMinLength) || passwordMinLength < PASSWORD_MIN_LENGTH_MIN || passwordMinLength > PASSWORD_MIN_LENGTH_MAX) {
    return { error: `Panjang minimal kata sandi harus bilangan bulat ${PASSWORD_MIN_LENGTH_MIN} sampai ${PASSWORD_MIN_LENGTH_MAX}.` };
  }

  await saveSecuritySettings(actor, { maxFailedAttempts, lockMinutes, passwordMinLength }, await currentRequestIp());
  revalidatePath("/settings/security");
  return { saved: Date.now() };
}
