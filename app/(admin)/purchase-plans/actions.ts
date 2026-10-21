"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { PENDING_NOTICE } from "@/lib/approvals/store";
import { todayInAppZone } from "@/lib/format";
import { currentRequestIp } from "@/lib/history/request-ip";
import { changeStatus, closePlan, createItemsFromLines, createPlan, receivePlan, saveLines, suggestLowStock, updateHeader } from "@/lib/purchase/service";
import { planHeaderSchema, planLinesSchema, receiveSchema, type PlanHeaderField } from "@/validations/purchase";

async function authorize(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

const isId = (id: string) => z.uuid().safeParse(id).success;

function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) out[field] = messages[0];
  }
  return out;
}

export interface NewPlanState {
  error?: string;
  fieldErrors?: Partial<Record<PlanHeaderField, string>>;
  attempt?: number;
}

export async function createPlanAction(_prev: NewPlanState, formData: FormData): Promise<NewPlanState> {
  const actor = await authorize();
  const parsed = planHeaderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), attempt: Date.now() };

  let result;
  try {
    result = await createPlan(actor, parsed.data, [], await currentRequestIp());
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Anda tidak berwenang membuat rencana pembelian ATK." };
    throw error;
  }
  if (!result.ok) return { error: result.error, attempt: Date.now() };

  revalidatePath("/purchase-plans");
  redirect(`/purchase-plans/${result.id}`);
}

export interface SavePlanResult {
  ok: boolean;
  error?: string;
  headerErrors?: Partial<Record<PlanHeaderField, string>>;
  /** Messages per line (index in the submitted list). */
  lineErrors?: Record<number, string[]>;
  savedAt?: number;
}

/** Save the header and all lines of a draft in one go. `payload` is JSON: { header, lines } with every number as typed text. */
export async function savePlanAction(planId: string, payload: string): Promise<SavePlanResult> {
  const actor = await authorize();
  if (!isId(planId)) return { ok: false, error: "Rencana pembelian tidak ditemukan." };

  let raw: { header?: unknown; lines?: unknown };
  try {
    raw = JSON.parse(payload) as typeof raw;
  } catch {
    return { ok: false, error: "Data tidak dapat dibaca. Muat ulang halaman." };
  }

  const header = planHeaderSchema.safeParse(raw.header);
  const lines = planLinesSchema.safeParse(raw.lines);
  if (!header.success || !lines.success) {
    const lineErrors: Record<number, string[]> = {};
    if (!lines.success) {
      for (const issue of lines.error.issues) {
        const index = typeof issue.path[0] === "number" ? issue.path[0] : -1;
        (lineErrors[index] ??= []).push(issue.message);
      }
    }
    return {
      ok: false,
      headerErrors: header.success ? undefined : firstErrors(header.error),
      lineErrors: lines.success ? undefined : lineErrors,
      error: "Periksa isian yang ditandai.",
    };
  }

  const ip = await currentRequestIp();
  try {
    const headerResult = await updateHeader(actor, planId, header.data, ip);
    if (!headerResult.ok) return { ok: false, error: headerResult.error };
    const linesResult = await saveLines(actor, planId, lines.data, ip);
    if (!linesResult.ok) return { ok: false, error: linesResult.error };
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: "Anda tidak berwenang mengubah rencana pembelian ATK." };
    throw error;
  }

  revalidatePath(`/purchase-plans/${planId}`);
  revalidatePath("/purchase-plans");
  return { ok: true, savedAt: Date.now() };
}

export async function suggestLowStockAction(planId: string) {
  const actor = await authorize();
  if (!isId(planId)) return [];
  return suggestLowStock(actor, planId);
}

export async function statusAction(planId: string, transition: "FINALIZE" | "REOPEN" | "CANCEL"): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(planId)) return { error: "Rencana pembelian tidak ditemukan." };
  try {
    const result = await changeStatus(actor, planId, transition, await currentRequestIp());
    if (!result.ok) return { error: result.error };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Anda tidak berwenang mengubah rencana pembelian ATK." };
    throw error;
  }
  revalidatePath(`/purchase-plans/${planId}`);
  revalidatePath("/purchase-plans");
  return { done: Date.now() };
}

export async function closePlanAction(planId: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(planId)) return { error: "Rencana pembelian tidak ditemukan." };
  try {
    const result = await closePlan(actor, planId, await currentRequestIp());
    if (!result.ok) return { error: result.error };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Anda tidak berwenang menutup rencana pembelian ATK." };
    throw error;
  }
  revalidatePath(`/purchase-plans/${planId}`);
  revalidatePath("/purchase-plans");
  return { done: Date.now() };
}

export async function receiveAction(planId: string, _prev: DialogState, formData: FormData): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(planId)) return { error: "Rencana pembelian tidak ditemukan." };

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("received:") && typeof value === "string") values[key.slice("received:".length)] = value;
  }
  const parsed = receiveSchema.safeParse(values);
  if (!parsed.success) return { error: "Jumlah diterima tidak valid. Gunakan angka, desimal dengan koma (contoh 2,5)." };
  const receivedAt = String(formData.get("receivedAt") ?? "").trim();
  if (receivedAt && !z.iso.date().safeParse(receivedAt).success) return { error: "Tanggal penerimaan tidak valid." };
  if (receivedAt && receivedAt > todayInAppZone()) return { error: "Tanggal penerimaan tidak boleh di masa depan." };
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  try {
    const result = await receivePlan(actor, planId, { quantities: parsed.data, receivedAt: receivedAt || undefined, notes: notes || undefined }, await currentRequestIp());
    if (!result.ok) return { error: result.error };
    if (result.pending) {
      revalidatePath("/approvals");
      return { done: Date.now(), notice: PENDING_NOTICE };
    }
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Anda tidak berwenang menerima barang rencana pembelian ATK." };
    throw error;
  }
  revalidatePath(`/purchase-plans/${planId}`);
  revalidatePath("/purchase-plans");
  revalidatePath("/inventory");
  revalidatePath("/");
  return { done: Date.now() };
}

/** Create ATK items for the lines that have none, and link them (see createItemsFromLines). */
export async function createItemsAction(planId: string): Promise<DialogState> {
  const actor = await authorize();
  if (!isId(planId)) return { error: "Rencana pembelian tidak ditemukan." };
  try {
    const result = await createItemsFromLines(actor, planId, await currentRequestIp());
    if (!result.ok) return { error: result.error };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "Anda tidak berwenang membuat barang ATK." };
    throw error;
  }
  revalidatePath(`/purchase-plans/${planId}`);
  revalidatePath("/inventory");
  revalidatePath("/");
  return { done: Date.now() };
}
