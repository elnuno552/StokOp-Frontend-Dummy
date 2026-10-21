"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthenticationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { itemById } from "@/lib/mock/data";
import { currentRequestIp } from "@/lib/history/request-ip";
import { collectCustomInput } from "@/lib/custom-fields/rules";
import { deleteItem, updateItem } from "@/lib/inventory/update";
import { updateAtkSchema, updateBmnSchema, type UpdateItemField } from "@/validations/item-update";

export interface EditItemState {
  error?: string;
  fieldErrors?: Partial<Record<UpdateItemField, string>>;
  attempt?: number;
}

async function authorize(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

export async function updateItemAction(itemId: string, _prev: EditItemState, formData: FormData): Promise<EditItemState> {
  const actor = await authorize();
  if (!z.uuid().safeParse(itemId).success) return { error: "Barang tidak ditemukan." };

  const item = itemById(itemId);
  if (!item) return { error: "Barang tidak ditemukan atau sudah dihapus." };

  const schema = item.type === "BMN" ? updateBmnSchema : updateAtkSchema;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
    }
    return { fieldErrors, attempt: Date.now() };
  }

  const result = await updateItem(actor, itemId, parsed.data, await currentRequestIp(), collectCustomInput(Object.fromEntries(formData)));
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, attempt: Date.now() };

  revalidatePath("/inventory");
  revalidatePath("/inventory/[id]", "page");
  redirect(`/inventory/${itemId}?notice=${result.changed ? "updated" : "unchanged"}`);
}

export async function deleteItemAction(itemId: string): Promise<EditItemState> {
  const actor = await authorize();
  if (!z.uuid().safeParse(itemId).success) return { error: "Barang tidak ditemukan." };

  const result = await deleteItem(actor, itemId, await currentRequestIp());
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath("/inventory");
  revalidatePath("/");
  redirect(`/inventory?deleted=${encodeURIComponent(result.code)}`);
}
