import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { items, locationById } from "@/lib/mock/data";
import { canReadInventory } from "@/lib/permissions";

const LIMIT = 8;

// Quick item lookup for the Ctrl+K palette. Same visibility as the inventory list: active items only.
export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    if (!canReadInventory(actor.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
    if (q.length < 2) return Response.json({ items: [] });

    const needle = q.toLowerCase();
    const found = items
      .filter((i) => [i.name, i.code, i.serialNumber].some((v) => (v ?? "").toLowerCase().includes(needle)))
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice(0, LIMIT);

    return Response.json(
      { items: found.map((i) => ({ id: i.id, code: i.code, name: i.name, type: i.type, locationName: locationById(i.locationId)?.name ?? null })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
