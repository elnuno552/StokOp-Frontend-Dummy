import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { items } from "@/lib/mock/data";
import { canMutateInventory } from "@/lib/permissions";

// GET /api/inventory/next-nup?kodeBarang=…&kodeSatker=…: the next free NUP for that Satker + Kode Barang.
// A suggestion only: the unique index still decides when two people add the same asset at once.
export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    if (!canMutateInventory(actor.role, "BMN")) return Response.json({ error: "Forbidden" }, { status: 403 });

    const params = new URL(request.url).searchParams;
    const kodeBarang = params.get("kodeBarang")?.trim();
    const kodeSatker = params.get("kodeSatker")?.trim();
    if (!kodeBarang || !kodeSatker) return Response.json({ error: "Isi Kode Satker dan Kode Barang dahulu." }, { status: 400 });

    const taken = items.filter((i) => i.kodeSatker === kodeSatker && i.kodeBarang === kodeBarang && i.nup !== null).map((i) => i.nup as number);
    return Response.json({ nup: Math.max(0, ...taken) + 1, existing: taken.length > 0 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
