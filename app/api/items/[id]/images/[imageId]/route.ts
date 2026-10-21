import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp } from "@/lib/history/log";
import { isSameOrigin } from "@/lib/http/same-origin";
import { deleteItemImage } from "@/lib/inventory/images";

// Demo build: there is no file storage, so no photo exists.
export async function GET() {
  return new Response("Not found", { status: 404 });
}

// DELETE /api/items/:id/images/:imageId
export async function DELETE(request: Request, ctx: RouteContext<"/api/items/[id]/images/[imageId]">) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();

    const { id, imageId } = await ctx.params;
    if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(imageId).success) {
      return Response.json({ error: "Foto tidak ditemukan." }, { status: 404 });
    }
    const result = await deleteItemImage(actor, id, imageId, getClientIp(request.headers));
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
