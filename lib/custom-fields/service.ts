import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { categories, fieldDefs, items, type FieldDefRec } from "@/lib/mock/data";
import { canManageSettings } from "@/lib/permissions";
import type { FieldDef } from "@/lib/custom-fields/rules";
import type { CustomFieldInput } from "@/validations/custom-field";

export type FieldResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

function assertCan(actor: AuthContext) {
  if (!canManageSettings(actor.role)) throw new AuthorizationError();
}

export interface FieldRow extends FieldDef {
  categoryId: string;
  sortOrder: number;
  showInList: boolean;
  filterable: boolean;
  archived: boolean;
  /** Items holding a value for this field. */
  usedBy: number;
}

const toDef = (r: FieldDefRec): FieldDef => ({ id: r.id, label: r.label, type: r.type, options: r.options, required: r.required });

const byOrder = (a: FieldDefRec, b: FieldDefRec) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime();

/** Fields asked for on the forms of a category (active only), in display order. Readable by any signed-in role. */
export async function getActiveFields(_db: unknown, categoryId: string | null | undefined): Promise<FieldDef[]> {
  if (!categoryId) return [];
  return fieldDefs.filter((d) => d.categoryId === categoryId && d.archivedAt === null).sort(byOrder).map(toDef);
}

/** Active fields of every category, for forms where the category can be switched. */
export async function getActiveFieldsByCategory(_db?: unknown): Promise<Record<string, FieldDef[]>> {
  const out: Record<string, FieldDef[]> = {};
  for (const r of [...fieldDefs].filter((d) => d.archivedAt === null).sort(byOrder)) (out[r.categoryId] ??= []).push(toDef(r));
  return out;
}

/** What the list needs for a category: its columns and filters, and everything needed to read stored values. */
export async function getListFields(categoryId: string | undefined) {
  if (!categoryId) return [];
  return fieldDefs
    .filter((d) => d.categoryId === categoryId && d.archivedAt === null)
    .sort(byOrder)
    .map((r) => ({ ...toDef(r), showInList: r.showInList, filterable: r.filterable }));
}

export interface CategoryFields {
  categoryId: string;
  categoryName: string;
  type: "BMN" | "ATK";
  fields: FieldRow[];
}

/** Every category with its fields (archived included), for the settings page. */
export async function listAllFields(actor: AuthContext): Promise<CategoryFields[]> {
  assertCan(actor);
  const usedBy = (id: string) => items.filter((i) => id in i.customValues).length;
  return [...categories]
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "id"))
    .map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      type: c.type,
      fields: fieldDefs
        .filter((d) => d.categoryId === c.id)
        .sort(byOrder)
        .map((d) => ({ ...toDef(d), categoryId: d.categoryId, sortOrder: d.sortOrder, showInList: d.showInList, filterable: d.filterable, archived: d.archivedAt !== null, usedBy: usedBy(d.id) })),
    }));
}

// Demo build: changes are accepted and not stored.
export async function saveField(actor: AuthContext, _id: string | null, _input: CustomFieldInput, _ipAddress: string | null): Promise<FieldResult> {
  assertCan(actor);
  return { ok: true };
}

export async function setFieldArchived(actor: AuthContext, _id: string, _archived: boolean, _ipAddress: string | null): Promise<FieldResult> {
  assertCan(actor);
  return { ok: true };
}

export async function deleteField(actor: AuthContext, _id: string, _ipAddress: string | null): Promise<FieldResult> {
  assertCan(actor);
  return { ok: true };
}

export async function moveField(actor: AuthContext, _id: string, _direction: "up" | "down", _ipAddress: string | null): Promise<FieldResult> {
  assertCan(actor);
  return { ok: true };
}
