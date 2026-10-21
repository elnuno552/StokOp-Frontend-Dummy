import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { buildImportTemplate } from "@/lib/inventory/import";
import { canMutateInventory } from "@/lib/permissions";

// GET: blank import template (.xlsx).
export async function GET() {
  try {
    const actor = await requireAuth();
    if (!canMutateInventory(actor.role, "BMN") && !canMutateInventory(actor.role, "ATK")) {
      return Response.json({ error: "Peran Anda tidak dapat mengimpor barang." }, { status: 403 });
    }
    const file = await buildImportTemplate();
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-impor-barang.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
