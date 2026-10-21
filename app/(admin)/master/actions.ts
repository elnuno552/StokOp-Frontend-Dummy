"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { deleteMaster, saveMaster, type MasterResult } from "@/lib/master/service";
import { MASTER_SCHEMAS, isMasterEntity } from "@/validations/master";

async function authorize(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

function finish(entity: string, result: MasterResult): DialogState {
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidatePath(`/master/${entity}`);
  revalidatePath("/locations");
  revalidatePath("/opname", "layout");
  revalidatePath("/inventory");
  return { done: Date.now() };
}

export async function saveMasterAction(entity: string, id: string | null, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isMasterEntity(entity)) return { error: "Data tidak dikenal." };
  if (id !== null && !z.uuid().safeParse(id).success) return { error: "Data tidak ditemukan." };

  const parsed = MASTER_SCHEMAS[entity].safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
    }
    return { fieldErrors };
  }
  return finish(entity, await saveMaster(actor, entity, id, parsed.data, await currentRequestIp()));
}

export async function deleteMasterAction(entity: string, id: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isMasterEntity(entity) || !z.uuid().safeParse(id).success) return { error: "Data tidak ditemukan." };
  return finish(entity, await deleteMaster(actor, entity, id, await currentRequestIp()));
}
