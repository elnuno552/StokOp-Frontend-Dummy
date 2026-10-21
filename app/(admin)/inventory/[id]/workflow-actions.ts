"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { borrowItem, returnItem, type WorkflowResult } from "@/lib/borrowing/service";
import { currentRequestIp } from "@/lib/history/request-ip";
import { reportMaintenance, updateMaintenance } from "@/lib/maintenance/service";
import {
  borrowSchema,
  completeMaintenanceSchema,
  reportMaintenanceSchema,
  returnSchema,
  type MaintenanceOp,
} from "@/validations/workflow";

async function authorize(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

function firstErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
  }
  return fieldErrors;
}

function finish(itemId: string, result: WorkflowResult): DialogState {
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  revalidatePath("/borrowings");
  revalidatePath("/");
  return { done: Date.now() };
}

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function borrowAction(itemId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId)) return { error: "Barang tidak ditemukan." };
  const parsed = borrowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await borrowItem(actor, itemId, parsed.data, await currentRequestIp()));
}

export async function returnAction(itemId: string, borrowingId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId) || !isId(borrowingId)) return { error: "Data peminjaman tidak ditemukan." };
  const parsed = returnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await returnItem(actor, borrowingId, parsed.data, await currentRequestIp()));
}

export async function reportMaintenanceAction(itemId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId)) return { error: "Barang tidak ditemukan." };
  const parsed = reportMaintenanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await reportMaintenance(actor, itemId, parsed.data, await currentRequestIp()));
}

export async function maintenanceAction(
  itemId: string,
  recordId: string,
  op: MaintenanceOp,
  _prev: DialogState,
  formData: FormData,
): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId) || !isId(recordId)) return { error: "Data perawatan tidak ditemukan." };

  let complete = null;
  if (op === "complete") {
    const parsed = completeMaintenanceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
    complete = parsed.data;
  }
  return finish(itemId, await updateMaintenance(actor, recordId, op, complete, await currentRequestIp()));
}
