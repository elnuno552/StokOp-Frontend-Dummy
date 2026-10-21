"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import type { WorkflowResult } from "@/lib/borrowing/service";
import { cancelDisposal, completeDisposal, decideDisposal, markFound, markLost, proposeDisposal } from "@/lib/disposal/service";
import { currentRequestIp } from "@/lib/history/request-ip";
import { decideDisposalSchema, markFoundSchema, markLostSchema, proposeDisposalSchema } from "@/validations/disposal";

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
  revalidatePath("/");
  revalidatePath("/approvals");
  return { done: Date.now(), notice: result.notice };
}

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function markLostAction(itemId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId)) return { error: "Barang tidak ditemukan." };
  const parsed = markLostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await markLost(actor, itemId, parsed.data, await currentRequestIp()));
}

export async function markFoundAction(itemId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId)) return { error: "Barang tidak ditemukan." };
  const parsed = markFoundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await markFound(actor, itemId, parsed.data, await currentRequestIp()));
}

export async function proposeDisposalAction(itemId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId)) return { error: "Barang tidak ditemukan." };
  const parsed = proposeDisposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await proposeDisposal(actor, itemId, parsed.data, await currentRequestIp()));
}

export async function decideDisposalAction(itemId: string, disposalId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId) || !isId(disposalId)) return { error: "Usulan tidak ditemukan." };
  const parsed = decideDisposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  return finish(itemId, await decideDisposal(actor, disposalId, parsed.data, await currentRequestIp()));
}

export async function completeDisposalAction(itemId: string, disposalId: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId) || !isId(disposalId)) return { error: "Usulan tidak ditemukan." };
  return finish(itemId, await completeDisposal(actor, disposalId, await currentRequestIp()));
}

export async function cancelDisposalAction(itemId: string, disposalId: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(itemId) || !isId(disposalId)) return { error: "Usulan tidak ditemukan." };
  return finish(itemId, await cancelDisposal(actor, disposalId, await currentRequestIp()));
}
