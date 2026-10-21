import { toErrorResponse } from "@/lib/auth/errors";
import { requireAuth } from "@/lib/auth/guards";
import { isSameOrigin } from "@/lib/http/same-origin";
import { ImportFileError, readSpreadsheet, validateImport } from "@/lib/inventory/import";
import { IMPORT_MAX_BYTES } from "@/lib/inventory/import-map";
import { previewSiman } from "@/lib/inventory/import-siman";
import { canMutateInventory } from "@/lib/permissions";

// POST (multipart, field "file"): read and validate a spreadsheet. Nothing is written.
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return Response.json({ error: "Permintaan ditolak." }, { status: 403 });
    const actor = await requireAuth();
    if (!canMutateInventory(actor.role, "BMN") && !canMutateInventory(actor.role, "ATK")) {
      return Response.json({ error: "Peran Anda tidak dapat mengimpor barang." }, { status: 403 });
    }
    if (Number(request.headers.get("content-length") ?? 0) > IMPORT_MAX_BYTES + 64 * 1024) {
      return Response.json({ error: "Ukuran file maksimal 5 MB." }, { status: 413 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "Data formulir tidak dapat dibaca." }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Pilih file .xlsx atau .csv." }, { status: 400 });
    if (file.size > IMPORT_MAX_BYTES) return Response.json({ error: "Ukuran file maksimal 5 MB." }, { status: 413 });

    const name = file.name.toLowerCase();
    const format = name.endsWith(".xlsx") ? "xlsx" : name.endsWith(".csv") ? "csv" : null;
    if (!format) return Response.json({ error: "Format file harus .xlsx atau .csv." }, { status: 400 });

    try {
      const { records, layout } = await readSpreadsheet(Buffer.from(await file.arrayBuffer()), format);
      if (layout === "siman") {
        const preview = await previewSiman(actor, records);
        return Response.json({ layout, records, ...preview });
      }
      const { rows, ignoredColumns } = await validateImport(actor, records);
      const errorCount = rows.filter((r) => r.errors.length > 0).length;
      return Response.json({ layout, rows, records, validCount: rows.length - errorCount, errorCount, ignoredColumns });
    } catch (error) {
      if (error instanceof ImportFileError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
