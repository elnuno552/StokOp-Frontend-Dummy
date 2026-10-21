import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp } from "@/lib/history/log";
import { isSameOrigin } from "@/lib/http/same-origin";
import { removeLineImage, setLineImage } from "@/lib/purchase/images";
import { ITEM_IMAGE_MAX_BYTES } from "@/validations/item";

type Ctx = RouteContext<"/api/purchase-plans/[id]/lines/[lineId]/image">;

async function ids(ctx: Ctx) {
  const { id, lineId } = await ctx.params;
  const ok = z.uuid().safeParse(id).success && z.uuid().safeParse(lineId).success;
  return ok ? { id, lineId } : null;
}

// Demo build: there is no file storage, so no photo exists.
export async function GET() {
  return new Response("Not found", { status: 404 });
}

// POST (multipart, field "image"): add or replace the photo.
export async function POST(request: Request, ctx: Ctx) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();
    const key = await ids(ctx);
    if (!key) return Response.json({ error: "Baris tidak ditemukan." }, { status: 404 });
    if (Number(request.headers.get("content-length") ?? 0) > ITEM_IMAGE_MAX_BYTES + 512 * 1024) {
      return Response.json({ error: "Ukuran foto maksimal 5 MB." }, { status: 413 });
    }
    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    if (!(file instanceof File)) return Response.json({ error: "Pilih file foto." }, { status: 400 });

    const result = await setLineImage(actor, key.id, key.lineId, file, getClientIp(request.headers));
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();
    const key = await ids(ctx);
    if (!key) return Response.json({ error: "Baris tidak ditemukan." }, { status: 404 });
    const result = await removeLineImage(actor, key.id, key.lineId, getClientIp(request.headers));
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
