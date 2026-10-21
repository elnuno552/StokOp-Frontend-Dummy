"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { approveBorrowing, cancelBorrowing, rejectBorrowing, type WorkflowResult } from "@/lib/borrowing/service";
import { currentRequestIp } from "@/lib/history/request-ip";
import { rejectBorrowSchema } from "@/validations/workflow";

async function authorize(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

function finish(result: WorkflowResult): DialogState {
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidatePath("/borrowings");
  revalidatePath("/inventory");
  revalidatePath("/");
  return { done: Date.now() };
}

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function approveBorrowingAction(borrowingId: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(borrowingId)) return { error: "Data peminjaman tidak ditemukan." };
  return finish(await approveBorrowing(actor, borrowingId, await currentRequestIp()));
}

export async function rejectBorrowingAction(borrowingId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(borrowingId)) return { error: "Data peminjaman tidak ditemukan." };
  const parsed = rejectBorrowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { reason: parsed.error.issues[0]?.message ?? "Isi alasan penolakan." } };
  return finish(await rejectBorrowing(actor, borrowingId, parsed.data, await currentRequestIp()));
}

export async function cancelBorrowingAction(borrowingId: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(borrowingId)) return { error: "Data peminjaman tidak ditemukan." };
  return finish(await cancelBorrowing(actor, borrowingId, await currentRequestIp()));
}
