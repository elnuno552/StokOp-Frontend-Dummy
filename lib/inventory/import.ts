import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { z } from "zod";
import type { AuthContext } from "@/lib/auth/guards";
import { categories as categoryRows, employees as employeeRows, items as itemRows, locations as locationRows } from "@/lib/mock/data";
import { collectCustomRaw, CUSTOM_HEADER_PREFIX, unclaimedCustomHeaders } from "@/lib/custom-fields/import";
import { validateCustomValues } from "@/lib/custom-fields/rules";
import { getActiveFieldsByCategory } from "@/lib/custom-fields/service";
import {
  IMPORT_COLUMNS,
  IMPORT_MAX_ROWS,
  headerToKey,
  isSimanHeaderSet,
  lookupKey,
  mapRecord,
  type ImportKey,
  type ImportLookups,
  type RawRecord,
} from "@/lib/inventory/import-map";
import { canMutateInventory } from "@/lib/permissions";
import { createItemSchema, type CreateItemInput } from "@/validations/item";

export class ImportFileError extends Error {}

export interface PreviewRow {
  /** Row number as shown in Excel (header is row 1). */
  rowNumber: number;
  errors: string[];
  type: string;
  name: string;
  code: string | null;
}

/** Cell value → plain text. Excel dates become YYYY-MM-DD. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String(value.text);
    return "";
  }
  return String(value).trim();
}

/** Read the first sheet of an .xlsx or .csv into rows keyed by column. Row 1 must hold the headers. */
export async function readSpreadsheet(buffer: Buffer, format: "xlsx" | "csv"): Promise<{ records: RawRecord[]; layout: "generic" | "siman" }> {
  const workbook = new ExcelJS.Workbook();
  let sheet: ExcelJS.Worksheet | undefined;
  try {
    if (format === "xlsx") {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      sheet = workbook.worksheets[0];
    } else {
      sheet = await workbook.csv.read(Readable.from(buffer));
    }
  } catch {
    throw new ImportFileError("File tidak dapat dibaca. Pastikan formatnya .xlsx atau .csv yang valid.");
  }
  if (!sheet || sheet.rowCount < 2) throw new ImportFileError("File kosong. Isi minimal satu baris data di bawah judul kolom.");

  const columns = new Map<number, ImportKey>();
  // Headers this importer does not know: they may be custom fields (matched by name once the row's category is known).
  const unknownColumns = new Map<number, string>();
  sheet.getRow(1).eachCell((cell, col) => {
    const header = cellText(cell.value);
    const key = headerToKey(header);
    if (key) columns.set(col, key);
    else if (header) unknownColumns.set(col, header);
  });
  const keys = new Set(columns.values());
  const isSiman = isSimanHeaderSet(keys);
  if (!isSiman && (!keys.has("type") || !keys.has("name"))) {
    throw new ImportFileError("Judul kolom tidak dikenali. Gunakan template atau file Daftar Aset (kolom Kode Barang, NUP, Nama Barang).");
  }

  const records: RawRecord[] = [];
  const rowNumbers: number[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: RawRecord = {};
    let hasValue = false;
    for (const [col, key] of columns) {
      const text = cellText(row.getCell(col).value);
      if (text) hasValue = true;
      record[key] = text;
    }
    // The Daftar Aset layout has its own importer, which does not read custom fields.
    if (!isSiman) {
      for (const [col, header] of unknownColumns) {
        const text = cellText(row.getCell(col).value);
        if (text) {
          hasValue = true;
          record[`${CUSTOM_HEADER_PREFIX}${header}`] = text;
        }
      }
    }
    if (hasValue) {
      records.push(record);
      rowNumbers.push(rowNumber);
    }
  });
  if (records.length === 0) throw new ImportFileError("Tidak ada baris data yang terisi.");
  if (records.length > IMPORT_MAX_ROWS) throw new ImportFileError(`Maksimal ${IMPORT_MAX_ROWS} baris per impor (file berisi ${records.length}).`);

  // Keep the Excel row number so messages point at the right line.
  return { records: records.map((r, i) => ({ ...r, _row: String(rowNumbers[i]) }) as RawRecord), layout: isSiman ? "siman" : "generic" };
}

async function loadLookups(): Promise<ImportLookups & { categoryNames: Map<string, string> }> {
  const categories = categoryRows;
  const locations = locationRows;
  const employees = employeeRows.filter((e) => e.isActive);
  const employeeMap = new Map<string, string>();
  for (const e of employees) {
    employeeMap.set(lookupKey(e.name), e.id);
    if (e.employeeNumber) employeeMap.set(lookupKey(e.employeeNumber), e.id);
  }
  return {
    categories: new Map(categories.map((c) => [`${c.type}:${lookupKey(c.name)}`, c.id])),
    locations: new Map(locations.map((l) => [lookupKey(l.name), l.id])),
    employees: employeeMap,
    categoryNames: new Map(categories.map((c) => [c.id, c.name])),
  };
}

const HEADER_FOR_FIELD: Record<string, ImportKey> = {
  categoryId: "category",
  locationId: "location",
  picId: "pic",
};

function fieldLabel(field: string): string {
  const key = (HEADER_FOR_FIELD[field] ?? field) as ImportKey;
  return IMPORT_COLUMNS.find((c) => c.key === key)?.header ?? field;
}

/** Validate every row the same way the create form does. Nothing is written. */
export async function validateImport(actor: AuthContext, records: RawRecord[]) {
  const [lookups, customFields] = await Promise.all([loadLookups(), getActiveFieldsByCategory()]);
  const rows: PreviewRow[] = [];
  const inputs: (CreateItemInput | null)[] = [];
  /** Custom field values per row, keyed by field id; parallel to `inputs`. */
  const customRaws: Record<string, string>[] = [];
  const seenCodes = new Map<string, number>();

  const manualCodes = records.map((r) => (r.code ?? "").trim().toUpperCase()).filter(Boolean);
  const takenInDb = new Set(itemRows.filter((i) => manualCodes.includes(i.code)).map((i) => i.code));

  records.forEach((record, index) => {
    const rowNumber = Number((record as Record<string, string>)._row ?? index + 2);
    const mapped = mapRecord(record, lookups);
    const errors = [...mapped.errors];

    let input: CreateItemInput | null = null;
    if (mapped.candidate.type !== "BMN" && mapped.candidate.type !== "ATK") {
      errors.unshift(`Tipe: isi BMN atau ATK.`);
    } else {
      const parsed = createItemSchema.safeParse(mapped.candidate);
      if (!parsed.success) {
        for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
          if (Array.isArray(messages) && messages[0]) errors.push(`${fieldLabel(field)}: ${messages[0]}`);
        }
      } else {
        input = parsed.data;
        const defs = input.categoryId ? (customFields[input.categoryId] ?? []) : [];
        const raw = collectCustomRaw(defs, input.categoryId ? lookups.categoryNames.get(input.categoryId) : undefined, record as Record<string, string | undefined>);
        const checked = validateCustomValues(defs, raw);
        errors.push(...Object.values(checked.errors));
        customRaws[index] = raw;
        if (!canMutateInventory(actor.role, input.type)) errors.push(`Tipe: Anda tidak berwenang menambah barang ${input.type}.`);
        if (input.code) {
          if (takenInDb.has(input.code)) errors.push(`Kode: ${input.code} sudah dipakai barang lain yang aktif.`);
          const earlier = seenCodes.get(input.code);
          if (earlier) errors.push(`Kode: ${input.code} sudah muncul di baris ${earlier}.`);
          else seenCodes.set(input.code, rowNumber);
        }
      }
    }

    rows.push({ rowNumber, errors, type: mapped.candidate.type, name: mapped.candidate.name, code: input?.code ?? null });
    inputs.push(errors.length === 0 ? input : null);
    customRaws[index] ??= {};
  });

  // Columns no custom field claims are ignored; the preview lists them so a typo in a header is noticed.
  const fields = Object.entries(customFields).flatMap(([categoryId, defs]) => defs.map((d) => ({ label: d.label, categoryName: lookups.categoryNames.get(categoryId) ?? "" })));
  const ignoredColumns = unclaimedCustomHeaders(records as Record<string, string | undefined>[], fields);

  return { rows, inputs, customRaws, ignoredColumns };
}

export type CommitResult = { ok: true; count: number } | { ok: false; error?: string; rows?: PreviewRow[] };

/** Create all rows in one transaction, or none. Re-validates on the server; the preview is not trusted. */
export async function commitImport(actor: AuthContext, records: RawRecord[], ipAddress: string | null): Promise<CommitResult> {
  if (records.length === 0) return { ok: false, error: "Tidak ada data untuk diimpor." };
  if (records.length > IMPORT_MAX_ROWS) return { ok: false, error: `Maksimal ${IMPORT_MAX_ROWS} baris per impor.` };

  const { rows, inputs } = await validateImport(actor, records);
  if (rows.some((r) => r.errors.length > 0)) return { ok: false, rows };

  // Demo build: the rows are validated as usual, but nothing is stored.
  void ipAddress;
  return { ok: true, count: inputs.length };
}

/** Blank template with two example rows. */
export async function buildImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Barang");
  sheet.addRow(IMPORT_COLUMNS.map((c) => c.header));
  sheet.addRow(IMPORT_COLUMNS.map((c) => c.example[0]));
  sheet.addRow(IMPORT_COLUMNS.map((c) => c.example[1]));
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 20;
  });

  const help = workbook.addWorksheet("Petunjuk");
  [
    "Isi data mulai baris 2 pada sheet Barang. Hapus dua baris contoh sebelum mengimpor.",
    "Tipe: BMN atau ATK. Nama wajib. Kode dikosongkan agar dibuat otomatis.",
    "Kategori, Lokasi, dan PIC harus sama persis dengan data master (PIC: nama atau NIP pegawai aktif).",
    "BMN: Kondisi (Baik / Rusak ringan / Rusak berat), Tgl. Perolehan (YYYY-MM-DD), Harga, Sumber Dana.",
    "ATK: Satuan wajib. Stok Awal dan Stok Minimum berupa angka.",
    "Kolom kustom: tambahkan kolom dengan judul sama persis dengan nama kolom kustom kategori (atau \"Nama kolom (Kategori)\" seperti hasil ekspor). Tanggal: YYYY-MM-DD atau 15 Mar 2026. Ya/Tidak: Ya, Tidak, 1, 0. Kolom wajib pada sebuah kategori harus terisi.",
    `Maksimal ${IMPORT_MAX_ROWS} baris. Jika ada satu baris yang salah, tidak ada barang yang diimpor.`,
  ].forEach((line) => help.addRow([line]));
  help.getColumn(1).width = 110;

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
