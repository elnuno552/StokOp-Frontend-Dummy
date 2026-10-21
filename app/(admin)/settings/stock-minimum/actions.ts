"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireCapability } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { saveMinimums } from "@/lib/stock-minimum/service";

export interface MinimumFormState {
  error?: string;
  message?: string;
  attempt?: number;
}

export async function saveMinimumsAction(_prev: MinimumFormState, formData: FormData): Promise<MinimumFormState> {
  let actor;
  try {
    actor = await requireCapability("manage_settings");
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) return { error: "Peran Anda tidak diizinkan mengubah pengaturan." };
    throw error;
  }

  const items: Record<string, string> = {};
  const categories: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key.startsWith("item:")) items[key.slice(5)] = value;
    else if (key.startsWith("cat:")) categories[key.slice(4)] = value;
  }

  const result = await saveMinimums(actor, { items, categories, applyDefaults: formData.get("applyDefaults") === "on" }, await currentRequestIp());
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath("/settings/stock-minimum");
  revalidatePath("/");
  revalidatePath("/inventory");
  const parts = [`${result.changed} barang`, `${result.defaultsChanged} bawaan kategori`];
  return { message: result.changed + result.defaultsChanged === 0 ? "Tidak ada perubahan." : `Tersimpan: ${parts.join(", ")} diperbarui.`, attempt: Date.now() };
}
