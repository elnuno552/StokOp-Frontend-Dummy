import type { AuthContext } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { currentYearInAppZone } from "@/lib/format";
import { canMutateInventory } from "@/lib/permissions";
import { items } from "@/lib/mock/data";
import type { CreateItemField, CreateItemInput, DetectedImage } from "@/validations/item";

export type CreateItemResult =
  | { ok: true; id: string; code: string }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<CreateItemField, string>> };

export interface ItemImageUpload {
  bytes: Uint8Array;
  fileName: string;
  detected: DetectedImage;
}

export class FieldError extends Error {
  constructor(readonly fieldErrors: Partial<Record<CreateItemField, string>>) {
    super("Field validation failed");
  }
}

/** Next free generated code, e.g. BMN-2026-00021. */
export async function nextItemCode(_db: unknown, type: ItemType): Promise<string> {
  const prefix = `${type}-${currentYearInAppZone()}-`;
  const used = items.filter((i) => i.code.startsWith(prefix)).map((i) => Number(i.code.slice(prefix.length)));
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(5, "0")}`;
}

/** Demo build: the input has been validated by the route; the item is not stored. */
export async function createItem(
  actor: AuthContext,
  input: CreateItemInput,
  _image: ItemImageUpload | null,
  _ipAddress: string | null,
  _customRaw: Record<string, string> = {},
): Promise<CreateItemResult> {
  if (!canMutateInventory(actor.role, input.type)) throw new AuthorizationError(`Role ${actor.role} cannot create ${input.type}`);
  if (input.code && items.some((i) => i.code === input.code)) return { ok: false, fieldErrors: { code: "Kode ini sudah dipakai barang lain yang aktif." } };
  // Land on an existing record so the redirect after saving shows a real detail page.
  const sample = items.find((i) => i.type === input.type) ?? items[0];
  return { ok: true, id: sample.id, code: input.code ?? (await nextItemCode(null, input.type)) };
}
