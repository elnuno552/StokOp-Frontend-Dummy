import type { AuthContext } from "@/lib/auth/guards";
import { categories as categoryRows, categoryById, items as itemRows, type ItemRec } from "@/lib/mock/data";
import type { RawRecord } from "@/lib/inventory/import-map";
import { IMPORT_MAX_ROWS } from "@/lib/inventory/import-map";
import { assetKey, diffSiman, parseSimanRecord, type SimanFields } from "@/lib/inventory/siman";
import { canMutateInventory } from "@/lib/permissions";

export type SimanRowStatus = "NEW" | "UPDATE" | "UNCHANGED" | "ERROR";

export interface SimanPreviewRow {
  /** Row number as shown in Excel (header is row 1). */
  rowNumber: number;
  status: SimanRowStatus;
  kodeBarang: string;
  nup: string;
  name: string;
  /** Labels of the fields that would change (UPDATE only). */
  changes: string[];
  errors: string[];
}

export interface SimanPreview {
  rows: SimanPreviewRow[];
  counts: Record<SimanRowStatus, number>;
  /** Jenis BMN values that do not exist yet and are created on import. */
  newCategories: string[];
}

interface RowPlan {
  status: Exclude<SimanRowStatus, "ERROR">;
  fields: SimanFields;
  existingId?: string;
}

const isoOf = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);
const numOf = (value: { toString(): string } | null) => (value === null ? null : Number(value));

type ExistingItem = ItemRec & { category: { name: string } | null };

function toFields(item: ExistingItem): SimanFields {
  return {
    categoryName: item.category?.name ?? null,
    kodeSatker: item.kodeSatker,
    kodeBarang: item.kodeBarang ?? "",
    nup: item.nup ?? 0,
    kodeRegister: item.kodeRegister,
    name: item.name,
    brand: item.brand,
    condition: item.condition === "LOST" ? "GOOD" : item.condition,
    umurAset: item.umurAset,
    tanggalBukuPertama: isoOf(item.tanggalBukuPertama),
    acquisitionDate: isoOf(item.acquisitionDate),
    nilaiPerolehanPertama: numOf(item.nilaiPerolehanPertama),
    nilaiMutasi: numOf(item.nilaiMutasi),
    acquisitionPrice: numOf(item.acquisitionPrice),
    nilaiPenyusutan: numOf(item.nilaiPenyusutan),
    nilaiBuku: numOf(item.nilaiBuku),
    statusPenggunaan: item.statusPenggunaan,
    noPsp: item.noPsp,
    tanggalPsp: isoOf(item.tanggalPsp),
  };
}

/** Work out, without writing anything, what importing these rows would do. */
async function analyze(actor: AuthContext, records: RawRecord[]) {
  const permitted = canMutateInventory(actor.role, "BMN");

  const parsed = records.map((record) => parseSimanRecord(record));
  const fieldsList = parsed.flatMap((p) => (p.fields ? [p.fields] : []));
  const registers = [...new Set(fieldsList.map((f) => f.kodeRegister).filter((v): v is string => Boolean(v)))];
  const kodes = [...new Set(fieldsList.map((f) => f.kodeBarang))];

  const existing: ExistingItem[] = itemRows
    .filter((i) => i.type === "BMN" && ((i.kodeRegister && registers.includes(i.kodeRegister)) || (i.kodeBarang && kodes.includes(i.kodeBarang))))
    .map((i) => ({ ...i, category: categoryById(i.categoryId) ? { name: categoryById(i.categoryId)!.name } : null }));
  const categories = categoryRows.filter((c) => c.type === "BMN");

  const byRegister = new Map(existing.flatMap((i) => (i.kodeRegister ? [[i.kodeRegister, i] as const] : [])));
  const byKey = new Map(existing.flatMap((i) => (i.kodeBarang && i.nup !== null ? [[assetKey({ kodeSatker: i.kodeSatker, kodeBarang: i.kodeBarang, nup: i.nup }), i] as const] : [])));
  const knownCategories = new Set(categories.map((c) => c.name.toLowerCase()));

  const rows: SimanPreviewRow[] = [];
  const plans: (RowPlan | null)[] = [];
  const seenRegister = new Map<string, number>();
  const seenKey = new Map<string, number>();
  const newCategories = new Map<string, string>();

  records.forEach((record, index) => {
    const rowNumber = Number((record as Record<string, string>)._row ?? index + 2);
    const { fields, errors: parseErrors } = parsed[index];
    const errors = [...parseErrors];
    const base = {
      rowNumber,
      kodeBarang: (record.kodeBarang ?? "").trim(),
      nup: (record.nup ?? "").trim(),
      name: (record.name ?? "").trim(),
    };

    if (!permitted) errors.push("Anda tidak berwenang mengimpor barang BMN.");

    let plan: RowPlan | null = null;
    if (fields && errors.length === 0) {
      const key = assetKey(fields);
      if (seenKey.has(key)) errors.push(`Aset ini (Kode Barang + NUP) sudah muncul di baris ${seenKey.get(key)}.`);
      else seenKey.set(key, rowNumber);
      if (fields.kodeRegister) {
        if (seenRegister.has(fields.kodeRegister)) errors.push(`Kode Register sudah muncul di baris ${seenRegister.get(fields.kodeRegister)}.`);
        else seenRegister.set(fields.kodeRegister, rowNumber);
      }

      const byReg = fields.kodeRegister ? byRegister.get(fields.kodeRegister) : undefined;
      const byIdentity = byKey.get(key);
      if (byReg && byIdentity && byReg.id !== byIdentity.id) {
        errors.push("Kode Register dan Kode Barang + NUP menunjuk ke dua aset berbeda yang sudah ada.");
      }
      const match = byReg ?? byIdentity;

      if (errors.length === 0) {
        if (!match) {
          plan = { status: "NEW", fields };
        } else {
          const changes = diffSiman(toFields(match), fields);
          plan = { status: changes.length ? "UPDATE" : "UNCHANGED", fields, existingId: match.id };
          rows.push({ ...base, status: plan.status, changes, errors: [] });
          plans.push(plan);
          if (fields.categoryName && !knownCategories.has(fields.categoryName.toLowerCase())) newCategories.set(fields.categoryName.toLowerCase(), fields.categoryName);
          return;
        }
        if (fields.categoryName && !knownCategories.has(fields.categoryName.toLowerCase())) newCategories.set(fields.categoryName.toLowerCase(), fields.categoryName);
      }
    }

    rows.push({ ...base, status: plan ? "NEW" : "ERROR", changes: [], errors });
    plans.push(errors.length === 0 ? plan : null);
  });

  const counts: Record<SimanRowStatus, number> = { NEW: 0, UPDATE: 0, UNCHANGED: 0, ERROR: 0 };
  for (const row of rows) counts[row.status]++;
  return { rows, plans, counts, newCategories: [...newCategories.values()] };
}

export async function previewSiman(actor: AuthContext, records: RawRecord[]): Promise<SimanPreview> {
  const { rows, counts, newCategories } = await analyze(actor, records);
  return { rows, counts, newCategories };
}

export type SimanCommitResult =
  | { ok: true; created: number; updated: number; unchanged: number }
  | { ok: false; error?: string; preview?: SimanPreview };

/**
 * Create new assets and update the register fields of existing ones.
 * Location, PIC and lending/maintenance status are never overwritten. The rows are analyzed again
 * here; the preview the browser holds is not trusted.
 */
export async function commitSiman(actor: AuthContext, records: RawRecord[], ipAddress: string | null): Promise<SimanCommitResult> {
  if (records.length === 0) return { ok: false, error: "Tidak ada data untuk diimpor." };
  if (records.length > IMPORT_MAX_ROWS) return { ok: false, error: `Maksimal ${IMPORT_MAX_ROWS} baris per impor.` };

  const analysis = await analyze(actor, records);
  if (analysis.counts.ERROR > 0) return { ok: false, preview: { rows: analysis.rows, counts: analysis.counts, newCategories: analysis.newCategories } };

  const plans = analysis.plans as RowPlan[];
  const created = plans.filter((p) => p.status === "NEW");
  const updated = plans.filter((p) => p.status === "UPDATE");

  // Demo build: the rows are analyzed as usual, but nothing is stored.
  void ipAddress;
  return { ok: true, created: created.length, updated: updated.length, unchanged: plans.length - created.length - updated.length };
}
