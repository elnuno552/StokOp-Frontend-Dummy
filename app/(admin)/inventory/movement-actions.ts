"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { PENDING_NOTICE } from "@/lib/approvals/store";
import { currentRequestIp } from "@/lib/history/request-ip";
import { applyMovement } from "@/lib/inventory/movements";
import { movementSchema, type MovementField } from "@/validations/movement";

export interface MovementFormState {
  error?: string;
  fieldErrors?: Partial<Record<MovementField, string>>;
  /** Set on success (timestamp) so the dialog can close and refresh. */
  done?: number;
  /** With `done`: the movement was filed for approval instead of applied. */
  notice?: string;
}

/** Stock in/out/adjustment for ATK and location/PIC transfer for BMN, for one or many items. */
export async function movementAction(_prev: MovementFormState, formData: FormData): Promise<MovementFormState> {
  let actor;
  try {
    actor = await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }

  const parsed = movementSchema.safeParse({
    kind: formData.get("kind"),
    itemIds: formData.getAll("itemId").map(String),
    quantity: formData.get("quantity") ?? undefined,
    description: formData.get("description") ?? undefined,
    toLocationId: formData.get("toLocationId") ?? undefined,
    toPicId: formData.get("toPicId") ?? undefined,
    toPicSource: formData.get("toPicSource") ?? undefined,
    toPicName: formData.get("toPicName") ?? undefined,
    toPicSave: formData.get("toPicSave") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
    }
    const formErrors = z.flattenError(parsed.error).formErrors;
    return { fieldErrors, error: formErrors[0] };
  }

  const result = await applyMovement(actor, parsed.data, await currentRequestIp());
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };

  revalidatePath("/inventory");
  revalidatePath("/inventory/[id]", "page");
  revalidatePath("/");
  if (result.pending) {
    revalidatePath("/approvals");
    return { done: Date.now(), notice: PENDING_NOTICE };
  }
  return { done: Date.now() };
}
