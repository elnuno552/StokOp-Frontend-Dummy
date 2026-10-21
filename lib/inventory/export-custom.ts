import { displayCustomValue } from "@/lib/custom-fields/rules";
import type { ExtraColumn } from "@/lib/inventory/export";
import type { ExportItem } from "@/lib/inventory/list";
import { categoryById, fieldDefs } from "@/lib/mock/data";

/**
 * Columns for the custom fields in a (standard layout) export. With a category filter: that category's active fields.
 * Without: every field, active or archived, that at least one exported item has a value for, named "Kolom (Kategori)".
 */
export async function buildCustomExportColumns(items: readonly ExportItem[], categoryId?: string): Promise<ExtraColumn[]> {
  const used = new Set<string>();
  for (const item of items) for (const key of Object.keys(item.customValues)) used.add(key);
  const defs = categoryId ? fieldDefs.filter((d) => d.categoryId === categoryId && d.archivedAt === null) : fieldDefs.filter((d) => used.has(d.id));

  return defs.map((d) => ({
    header: categoryId ? d.label : `${d.label} (${categoryById(d.categoryId)?.name ?? "—"})`,
    width: 22,
    value: (item: ExportItem) => {
      const stored = item.customValues[d.id];
      const shown = displayCustomValue({ type: d.type }, stored);
      return shown === "" ? null : d.type === "NUMBER" && typeof stored === "number" ? stored : shown;
    },
  }));
}
