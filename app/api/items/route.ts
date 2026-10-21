import path from "node:path";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp } from "@/lib/history/log";
import { collectCustomInput } from "@/lib/custom-fields/rules";
import { createItem, type ItemImageUpload } from "@/lib/inventory/create";
import { canMutateInventory } from "@/lib/permissions";
import {
  ITEM_IMAGE_MAX_BYTES,
  createItemSchema,
  detectImageType,
  type CreateItemField,
} from "@/validations/item";

// Photo (5 MB) plus text fields, with headroom for multipart overhead.
const MAX_BODY_BYTES = ITEM_IMAGE_MAX_BYTES + 512 * 1024;

type FieldErrors = Partial<Record<CreateItemField, string>>;

const badRequest = (body: { error?: string; fieldErrors?: FieldErrors }, status = 400) => Response.json(body, { status });

/**
 * Route handlers do not get the Server Action origin check, so reject
 * cross-site requests explicitly (the session cookie is SameSite=Lax as well).
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function firstErrors(error: z.ZodError): FieldErrors {
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) result[field] = messages[0];
  }
  // A missing or unknown type is reported by the discriminated union at the root.
  const formError = z.flattenError(error).formErrors[0];
  if (formError && !result.type) result.type = formError;
  return result;
}

function safeFileName(name: string, extension: string): string {
  const base = path.basename(name).replace(/[\u0000-\u001f\u007f"\\/]/g, "").trim();
  return (base || `foto.${extension}`).slice(0, 255);
}

// POST /api/items (multipart/form-data): create a BMN or ATK item, optionally with one photo.
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return badRequest({ error: "Permintaan ditolak." }, 403);

    const actor = await requireAuth();
    if (!canMutateInventory(actor.role, "BMN") && !canMutateInventory(actor.role, "ATK")) {
      return badRequest({ error: "Peran Anda tidak dapat menambah barang." }, 403);
    }

    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BODY_BYTES) {
      return badRequest({ fieldErrors: { image: "Ukuran foto maksimal 5 MB." } }, 413);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return badRequest({ error: "Data formulir tidak dapat dibaca." });
    }

    const fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
    const parsed = createItemSchema.safeParse(fields);

    // Validate the photo even when other fields fail, so every problem is reported at once.
    let image: ItemImageUpload | null = null;
    let imageError: string | undefined;
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      if (file.size > ITEM_IMAGE_MAX_BYTES) {
        imageError = "Ukuran foto maksimal 5 MB.";
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const detected = detectImageType(bytes);
        if (!detected) imageError = "Foto harus berformat JPG, PNG, atau HEIC.";
        else image = { bytes, detected, fileName: safeFileName(file.name, detected.extension) };
      }
    }

    if (!parsed.success || imageError) {
      return badRequest({
        fieldErrors: { ...(parsed.success ? {} : firstErrors(parsed.error)), ...(imageError && { image: imageError }) },
      });
    }

    if (!canMutateInventory(actor.role, parsed.data.type)) {
      return badRequest(
        { error: `Peran Anda tidak dapat menambah barang ${parsed.data.type}.`, fieldErrors: { type: "Jenis ini di luar hak akses Anda." } },
        403,
      );
    }

    const result = await createItem(actor, parsed.data, image, getClientIp(request.headers), collectCustomInput(fields));
    if (!result.ok) return badRequest({ error: result.error, fieldErrors: result.fieldErrors });

    return Response.json({ id: result.id, code: result.code }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
