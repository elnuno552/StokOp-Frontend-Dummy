"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireCapability } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { LOW_STOCK_LIMIT_MAX, LOW_STOCK_LIMIT_MIN, REMINDER_DAYS_MAX, REMINDER_DAYS_MIN } from "@/lib/settings/defaults";
import { saveAppSettings } from "@/lib/settings/service";

export interface SettingsState {
  error?: string;
  saved?: number;
}

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  let actor;
  try {
    actor = await requireCapability("manage_settings");
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) return { error: "Peran Anda tidak diizinkan mengubah pengaturan." };
    throw error;
  }

  const days = Number(String(formData.get("reminderDays") ?? "").trim());
  if (!Number.isInteger(days) || days < REMINDER_DAYS_MIN || days > REMINDER_DAYS_MAX) {
    return { error: `Hari pengingat harus bilangan bulat ${REMINDER_DAYS_MIN} sampai ${REMINDER_DAYS_MAX}.` };
  }

  const limit = Number(String(formData.get("lowStockLimit") ?? "").trim());
  if (!Number.isInteger(limit) || limit < LOW_STOCK_LIMIT_MIN || limit > LOW_STOCK_LIMIT_MAX) {
    return { error: `Jumlah daftar stok menipis harus bilangan bulat ${LOW_STOCK_LIMIT_MIN} sampai ${LOW_STOCK_LIMIT_MAX}.` };
  }

  await saveAppSettings(actor, { reminderDays: days, lowStockEnabled: formData.get("lowStockEnabled") === "on", lowStockLimit: limit, approvalsRequired: formData.getAll("approvalsRequired") }, await currentRequestIp());
  revalidatePath("/settings");
  revalidatePath("/");
  return { saved: Date.now() };
}
