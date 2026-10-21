import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { todayInAppZone } from "@/lib/format";
import { getClientIp } from "@/lib/history/log";
import { isSameOrigin } from "@/lib/http/same-origin";
import { factorToPercent } from "@/lib/purchase/calc";
import { PlanFileError, parsePlanWorkbook } from "@/lib/purchase/excel";
import { canManagePlans, createPlan, type NewPlanLine } from "@/lib/purchase/service";
import { PURCHASE_MAX_LINES, planLineSchema } from "@/validations/purchase";

const MAX_BYTES = 8 * 1024 * 1024; // photos are embedded in the workbook

// POST (multipart, field "file"): read a RAB .xlsx and create a DRAFT plan from it. The draft can be reviewed and edited before it is finalized.
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();
    if (!canManagePlans(actor)) return Response.json({ error: "Peran Anda tidak dapat membuat rencana pembelian ATK." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) {
      return Response.json({ error: "Ukuran file maksimal 8 MB." }, { status: 413 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Pilih file .xlsx." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "Ukuran file maksimal 8 MB." }, { status: 413 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return Response.json({ error: "Format file harus .xlsx." }, { status: 400 });

    let parsed;
    try {
      parsed = await parsePlanWorkbook(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof PlanFileError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
    if (parsed.lines.length > PURCHASE_MAX_LINES) {
      return Response.json({ error: `Maksimal ${PURCHASE_MAX_LINES} baris (file berisi ${parsed.lines.length}).` }, { status: 400 });
    }

    // Validate every line the same way the editor does; report all problems by Excel row.
    const lines: NewPlanLine[] = [];
    const problems: string[] = [];
    for (const line of parsed.lines) {
      const result = planLineSchema.safeParse({
        description: line.description,
        volume: line.volume,
        unit: line.unit,
        unitPrice: line.unitPrice,
        shippingCost: line.shippingCost,
        link: line.link,
      });
      if (!result.success) {
        for (const messages of Object.values(z.flattenError(result.error).fieldErrors)) {
          if (Array.isArray(messages) && messages[0]) problems.push(`Baris ${line.rowNumber}: ${messages[0]}`);
        }
        continue;
      }
      const { id: _id, itemId: _itemId, ...rest } = result.data;
      void _id;
      void _itemId;
      lines.push({ ...rest, image: line.image ?? undefined });
    }
    if (problems.length > 0) {
      return Response.json({ error: `File tidak dapat diimpor:\n${problems.slice(0, 10).join("\n")}${problems.length > 10 ? `\n…dan ${problems.length - 10} masalah lain.` : ""}` }, { status: 400 });
    }

    const result = await createPlan(
      actor,
      {
        title: parsed.title,
        planDate: parsed.planDate ?? todayInAppZone(),
        pricePercent: parsed.priceFactor, // already the factor: the schema's output for this key is the factor
        ppnRate: parsed.ppnRate,
        rounding: undefined,
        notes: `Diimpor dari ${file.name.slice(0, 200)}`,
      },
      lines,
      getClientIp(request.headers),
    );
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ id: result.id, code: result.code, lines: lines.length, percent: factorToPercent(parsed.priceFactor) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
