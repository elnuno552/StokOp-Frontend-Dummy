import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp, writeHistoryLog } from "@/lib/history/log";
import { exportPlanXlsx } from "@/lib/purchase/excel";
import { readPlanImages } from "@/lib/purchase/images";
import { getPlan } from "@/lib/purchase/service";

// GET: the plan as an .xlsx in the layout of the institution's RAB sheet (live formulas, photos, links).
export async function GET(request: Request, ctx: RouteContext<"/api/purchase-plans/[id]/export">) {
  try {
    const actor = await requireAuth();
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) return Response.json({ error: "Rencana tidak ditemukan." }, { status: 404 });

    const plan = await getPlan(actor, id);
    if (!plan) return Response.json({ error: "Rencana tidak ditemukan." }, { status: 404 });

    const file = await exportPlanXlsx(plan, await readPlanImages(id));
    await writeHistoryLog(null, {
      actor,
      action: "EXPORT",
      module: "PurchasePlan",
      referenceId: id,
      description: `Mengekspor rencana pembelian ${plan.code} (XLSX)`,
      ipAddress: getClientIp(request.headers),
    });

    const stamp = plan.planDate;
    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${plan.code}-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
