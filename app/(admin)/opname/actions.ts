"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { cancelOpname, completeOpname, createOpname, saveCounts } from "@/lib/opname/service";
import { createOpnameSchema } from "@/validations/opname";

export interface OpnameFormState {
  error?: string;
  fieldErrors?: Partial<Record<"locationId" | "type" | "notes" | "mode" | "categoryId", string>>;
  /** Success message for the count sheet. */
  message?: string;
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

function validId(id: string) {
  return z.uuid().safeParse(id).success;
}

export async function createOpnameAction(_prev: OpnameFormState, formData: FormData): Promise<OpnameFormState> {
  const actor = await authorize();
  const parsed = createOpnameSchema.safeParse({
    mode: formData.get("mode") ?? undefined,
    categoryId: formData.get("categoryId") ?? undefined,
    locationId: formData.get("locationId") ?? undefined,
    type: formData.get("type") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
    }
    return { fieldErrors, attempt: Date.now() };
  }

  let result;
  try {
    result = await createOpname(actor, parsed.data, await currentRequestIp());
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Anda tidak berwenang memulai stock opname." };
    throw error;
  }
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath("/opname");
  redirect(`/opname/${result.id}`);
}

export async function saveCountsAction(opnameId: string, _prev: OpnameFormState, formData: FormData): Promise<OpnameFormState> {
  const actor = await authorize();
  if (!validId(opnameId)) return { error: "Sesi opname tidak ditemukan." };

  const form: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (key.startsWith("row:") && typeof value === "string") form[key] = value;

  const result = await saveCounts(actor, opnameId, form);
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath(`/opname/${opnameId}`);
  revalidatePath("/opname");
  return { message: `${result.saved} hasil hitung disimpan.`, attempt: Date.now() };
}

export async function completeOpnameAction(opnameId: string, _prev: OpnameFormState, formData: FormData): Promise<OpnameFormState> {
  const actor = await authorize();
  if (!validId(opnameId)) return { error: "Sesi opname tidak ditemukan." };

  const result = await completeOpname(actor, opnameId, formData.get("applyAdjustments") === "on", formData.get("applyBmn") === "on", await currentRequestIp());
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath(`/opname/${opnameId}`);
  revalidatePath("/opname");
  revalidatePath("/inventory");
  revalidatePath("/");
  const parts = [
    result.adjusted > 0 ? `${result.adjusted} stok ATK disesuaikan` : null,
    result.placed > 0 ? `${result.placed} BMN dipindahkan ke lokasi hasil pemeriksaan` : null,
    result.conditionChanged > 0 ? `${result.conditionChanged} kondisi BMN diperbarui` : null,
    result.skipped > 0 ? `${result.skipped} BMN dilewati (sedang dipinjam, diperbaiki, hilang, atau dihapuskan)` : null,
    result.requested > 0 ? `${result.requested} usulan menunggu persetujuan di menu Persetujuan` : null,
  ].filter(Boolean);
  return { message: parts.length > 0 ? `Opname selesai. ${parts.join("; ")}.` : "Opname selesai.", attempt: Date.now() };
}

export async function cancelOpnameAction(opnameId: string): Promise<OpnameFormState> {
  const actor = await authorize();
  if (!validId(opnameId)) return { error: "Sesi opname tidak ditemukan." };

  const result = await cancelOpname(actor, opnameId, await currentRequestIp());
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath(`/opname/${opnameId}`);
  revalidatePath("/opname");
  return { message: "Sesi opname dibatalkan.", attempt: Date.now() };
}
