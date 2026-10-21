"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DialogState } from "@/components/ui/action-dialog";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireAuth, type AuthContext } from "@/lib/auth/guards";
import { currentRequestIp } from "@/lib/history/request-ip";
import { canManageRoles } from "@/lib/permissions";
import { createRole, deleteRole, updateRole, type RoleResult } from "@/lib/roles/service";
import { createRoleSchema, roleInputSchema } from "@/validations/role";

export interface RoleFormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  saved?: number;
}

async function authorize(): Promise<AuthContext> {
  try {
    const actor = await requireAuth();
    if (!canManageRoles(actor.role)) throw new AuthorizationError();
    return actor;
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

async function guarded(run: (actor: AuthContext) => Promise<RoleResult>): Promise<RoleResult> {
  try {
    return await run(await authorize());
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: "Hanya Hyper Admin yang dapat mengelola peran." };
    throw error;
  }
}

function afterChange() {
  // Menus depend on the roles, so every admin page may change.
  revalidatePath("/", "layout");
}

function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) out[field] = messages[0];
  }
  return out;
}

export async function createRoleAction(_prev: DialogState, formData: FormData): Promise<DialogState> {
  const parsed = createRoleSchema.safeParse({ label: formData.get("label"), copyFrom: formData.get("copyFrom") ?? undefined, capabilities: [] });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  const result = await guarded(async (actor) => createRole(actor, parsed.data, await currentRequestIp()));
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  afterChange();
  return { done: Date.now() };
}

export async function saveRoleAction(name: string, _prev: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const parsed = roleInputSchema.safeParse({ label: formData.get("label"), capabilities: formData.getAll("capabilities") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  const result = await guarded(async (actor) => updateRole(actor, name, parsed.data, await currentRequestIp()));
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  afterChange();
  return { saved: Date.now() };
}

export async function deleteRoleAction(name: string): Promise<DialogState> {
  const result = await guarded(async (actor) => deleteRole(actor, name, await currentRequestIp()));
  if (!result.ok) return { error: result.error };
  afterChange();
  return { done: Date.now() };
}
