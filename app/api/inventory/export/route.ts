import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { getClientIp, writeHistoryLog } from "@/lib/history/log";
import { toAssetRegisterXlsx, toCsv, toXlsx } from "@/lib/inventory/export";
import { buildCustomExportColumns } from "@/lib/inventory/export-custom";
import { activeFilterKeys } from "@/lib/inventory/list-query";
import { EXPORT_MAX_ROWS, listItemsForExport } from "@/lib/inventory/list";
import { inventoryExportQuerySchema, withCustomFilters } from "@/validations/inventory";

// GET /api/inventory/export?format=csv|xlsx&<list filters>[&ids=<uuid,...>]
// Every role may read (and so export) all inventory; the export is logged.
export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    const url = new URL(request.url);
    const parsed = inventoryExportQuerySchema.safeParse(withCustomFilters(Object.fromEntries(url.searchParams)));
    // Only `ids` can fail (other params fall back to defaults). Never widen a bad selection to "everything".
    if (!parsed.success) {
      return Response.json({ error: "Pilihan baris tidak valid. Muat ulang halaman lalu pilih lagi." }, { status: 400 });
    }
    // The register layout is BMN only, whatever the type filter says.
    const query = parsed.data.layout === "aset" ? { ...parsed.data, type: "BMN" as const, format: "xlsx" as const } : parsed.data;

    const items = await listItemsForExport(actor, query, query.ids);
    if (!items) {
      return Response.json(
        { error: `Hasil ekspor melebihi ${EXPORT_MAX_ROWS.toLocaleString("id-ID")} baris. Persempit filter terlebih dahulu.` },
        { status: 400 },
      );
    }

    const filters = Object.fromEntries(
      [...activeFilterKeys(query), ...(query.q ? (["q"] as const) : [])].map((key) => [key, query[key] ?? null]),
    );
    await writeHistoryLog(null, {
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "EXPORT",
      module: "Inventory",
      description: `Mengekspor ${items.length} barang inventaris (${query.layout === "aset" ? "format Daftar Aset, " : ""}${query.format.toUpperCase()}${query.ids ? ", baris terpilih" : ""})`,
      newValue: { format: query.format, layout: query.layout, count: items.length, selected: Boolean(query.ids), filters },
      ipAddress: getClientIp(request.headers),
    });

    const extra = query.layout === "aset" ? [] : await buildCustomExportColumns(items, query.category);
    const stamp = new Date().toISOString().slice(0, 10);
    const headers = { "Cache-Control": "no-store" };
    if (query.layout === "aset") {
      return new Response(await toAssetRegisterXlsx(items), {
        headers: {
          ...headers,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="daftar-aset-${stamp}.xlsx"`,
        },
      });
    }
    if (query.format === "csv") {
      return new Response(toCsv(items, extra), {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="inventaris-${stamp}.csv"`,
        },
      });
    }
    return new Response(await toXlsx(items, extra), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventaris-${stamp}.xlsx"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
