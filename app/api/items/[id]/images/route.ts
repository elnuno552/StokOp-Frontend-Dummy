import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp } from "@/lib/history/log";
import { isSameOrigin } from "@/lib/http/same-origin";
import { addItemImage } from "@/lib/inventory/images";
import { ITEM_IMAGE_MAX_BYTES } from "@/validations/item";

// POST /api/items/:id/images (multipart, field "image"): add one photo to an item.
export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/images">) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();

    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) return Response.json({ error: "Barang tidak ditemukan." }, { status: 404 });

    if (Number(request.headers.get("content-length") ?? 0) > ITEM_IMAGE_MAX_BYTES + 512 * 1024) {
      return Response.json({ error: "Ukuran foto maksimal 5 MB." }, { status: 413 });
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "Data formulir tidak dapat dibaca." }, { status: 400 });
    }
    const file = form.get("image");
    if (!(file instanceof File)) return Response.json({ error: "Pilih file foto." }, { status: 400 });

    const result = await addItemImage(actor, id, file, getClientIp(request.headers));
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
