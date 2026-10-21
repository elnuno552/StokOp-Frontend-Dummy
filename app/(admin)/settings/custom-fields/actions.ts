"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireCapability, type AuthContext } from "@/lib/auth/guards";
import { deleteField, moveField, saveField, setFieldArchived, type FieldResult } from "@/lib/custom-fields/service";
import { currentRequestIp } from "@/lib/history/request-ip";
import { customFieldSchema } from "@/validations/custom-field";

async function authorize(): Promise<AuthContext> {
  try {
    return await requireCapability("manage_settings");
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

async function guarded(run: (actor: AuthContext) => Promise<FieldResult>): Promise<DialogState> {
  try {
    const result = await run(await authorize());
    if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Peran Anda tidak diizinkan mengubah pengaturan." };
    throw error;
  }
  // The columns appear on item forms, details, the list and exports.
  revalidatePath("/settings/custom-fields");
  revalidatePath("/inventory", "layout");
  return { done: Date.now() };
}

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function saveFieldAction(id: string | null, _prev: DialogState, formData: FormData): Promise<DialogState> {
  if (id !== null && !isId(id)) return { error: "Kolom tidak ditemukan." };
  const parsed = customFieldSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
    }
    return { fieldErrors };
  }
  return guarded(async (actor) => saveField(actor, id, parsed.data, await currentRequestIp()));
}

export async function archiveFieldAction(id: string, archived: boolean): Promise<DialogState> {
  if (!isId(id)) return { error: "Kolom tidak ditemukan." };
  return guarded(async (actor) => setFieldArchived(actor, id, archived, await currentRequestIp()));
}

export async function deleteFieldAction(id: string): Promise<DialogState> {
  if (!isId(id)) return { error: "Kolom tidak ditemukan." };
  return guarded(async (actor) => deleteField(actor, id, await currentRequestIp()));
}

export async function moveFieldAction(id: string, direction: "up" | "down"): Promise<DialogState> {
  if (!isId(id)) return { error: "Kolom tidak ditemukan." };
  return guarded(async (actor) => moveField(actor, id, direction, await currentRequestIp()));
}
