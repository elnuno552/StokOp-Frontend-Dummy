"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { approveRequest, cancelRequest, rejectRequest, type ApprovalActionResult } from "@/lib/approvals/service";
import { currentRequestIp } from "@/lib/history/request-ip";

async function authorize(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

function finish(result: ApprovalActionResult): DialogState {
  if (!result.ok) return { error: result.error };
  // An approval can change stock, locations, plans and disposals.
  revalidatePath("/approvals");
  revalidatePath("/inventory");
  revalidatePath("/purchase-plans");
  revalidatePath("/");
  return { done: Date.now() };
}

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function approveRequestAction(id: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(id)) return { error: "Permintaan tidak ditemukan." };
  return finish(await approveRequest(actor, id, await currentRequestIp()));
}

export async function rejectRequestAction(id: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(id)) return { error: "Permintaan tidak ditemukan." };
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason === "") return { fieldErrors: { reason: "Isi alasan penolakan." } };
  if (reason.length > 500) return { fieldErrors: { reason: "Alasan maksimal 500 karakter." } };
  return finish(await rejectRequest(actor, id, reason, await currentRequestIp()));
}

export async function cancelRequestAction(id: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(id)) return { error: "Permintaan tidak ditemukan." };
  return finish(await cancelRequest(actor, id, await currentRequestIp()));
}
