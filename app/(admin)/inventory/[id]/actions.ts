"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { addItemNote } from "@/lib/inventory/notes";
import { createNoteSchema } from "@/validations/note";
import { redirect } from "next/navigation";

export interface NoteFormState {
  error?: string;
  /** Changes after each successful save so the form resets. */
  saved?: number;
}

export async function addNoteAction(itemId: string, _prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  let actor;
  try {
    actor = await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }

  if (!z.uuid().safeParse(itemId).success) return { error: "Barang tidak ditemukan." };
  const parsed = createNoteSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Catatan tidak valid." };

  const result = await addItemNote(actor, itemId, parsed.data, await currentRequestIp());
  if (!result.ok) return { error: result.error };

  revalidatePath(`/inventory/${itemId}`);
  return { saved: Date.now() };
}
