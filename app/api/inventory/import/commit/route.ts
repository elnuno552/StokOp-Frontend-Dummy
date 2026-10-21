import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp } from "@/lib/history/log";
import { isSameOrigin } from "@/lib/http/same-origin";
import { commitImport } from "@/lib/inventory/import";
import { IMPORT_MAX_ROWS, type RawRecord } from "@/lib/inventory/import-map";
import { commitSiman } from "@/lib/inventory/import-siman";
import { canMutateInventory } from "@/lib/permissions";

const bodySchema = z.object({
  layout: z.enum(["generic", "siman"]).default("generic"),
  records: z.array(z.record(z.string(), z.string().max(2000))).min(1).max(IMPORT_MAX_ROWS),
});

// POST (JSON {records, layout}): import the rows in one transaction. Rows are validated again here.
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();
    if (!canMutateInventory(actor.role, "BMN") && !canMutateInventory(actor.role, "ATK")) {
      return Response.json({ error: "Peran Anda tidak dapat mengimpor barang." }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Data impor tidak valid." }, { status: 400 });
    const records = parsed.data.records as RawRecord[];
    const ip = getClientIp(request.headers);

    if (parsed.data.layout === "siman") {
      const result = await commitSiman(actor, records, ip);
      if (!result.ok) return Response.json({ error: result.error ?? "Impor dibatalkan. Ada baris yang bermasalah.", preview: result.preview }, { status: 400 });
      return Response.json({ created: result.created, updated: result.updated, unchanged: result.unchanged, count: result.created + result.updated }, { status: 201 });
    }

    const result = await commitImport(actor, records, ip);
    if (!result.ok) return Response.json({ error: result.error, rows: result.rows }, { status: 400 });
    return Response.json({ count: result.count }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
