// Pure helpers for the Excel/CSV import: column names, cell cleanup and mapping a spreadsheet row
// to the fields that createItemSchema expects. No I/O, so it can be tested directly.

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export const IMPORT_COLUMNS = [
  { key: "type", header: "Tipe", example: ["BMN", "ATK"] },
  { key: "code", header: "Kode", example: ["", ""] },
  { key: "name", header: "Nama", example: ["Laptop Lenovo ThinkPad", "Kertas HVS A4 80 gsm"] },
  { key: "category", header: "Kategori", example: ["Perangkat Komputer", "Kertas dan Amplop"] },
  { key: "location", header: "Lokasi", example: ["Ruang Server", "Gudang ATK"] },
  { key: "pic", header: "PIC", example: ["Budi Santoso", ""] },
  { key: "brand", header: "Merek", example: ["Lenovo", ""] },
  { key: "model", header: "Model", example: ["T14", ""] },
  { key: "serialNumber", header: "No. Seri", example: ["PF-3XK921", ""] },
  { key: "condition", header: "Kondisi", example: ["Baik", ""] },
  { key: "acquisitionDate", header: "Tgl. Perolehan", example: ["2024-03-15", ""] },
  { key: "acquisitionPrice", header: "Harga", example: ["15000000", ""] },
  { key: "fundingSource", header: "Sumber Dana", example: ["APBN", ""] },
  { key: "unit", header: "Satuan", example: ["", "rim"] },
  { key: "initialStock", header: "Stok Awal", example: ["", "20"] },
  { key: "minimumStock", header: "Stok Minimum", example: ["", "5"] },
  { key: "description", header: "Keterangan", example: ["", ""] },
] as const;

/**
 * Columns of the SIMAN "Daftar Aset" export, in the order of the source file (also the order of the
 * "format Daftar Aset" export). "No" is a running number and is not imported.
 */
export const SIMAN_COLUMNS = [
  { key: "no", header: "No" },
  { key: "category", header: "Jenis BMN" },
  { key: "kodeSatker", header: "Kode Satker" },
  { key: "kodeBarang", header: "Kode Barang" },
  { key: "nup", header: "NUP" },
  { key: "name", header: "Nama Barang" },
  { key: "brand", header: "Merk" },
  { key: "condition", header: "Kondisi" },
  { key: "umurAset", header: "Umur Aset" },
  { key: "tanggalBukuPertama", header: "Tanggal Buku Pertama" },
  { key: "acquisitionDate", header: "Tanggal Perolehan" },
  { key: "nilaiPerolehanPertama", header: "Nilai Perolehan Pertama" },
  { key: "nilaiMutasi", header: "Nilai Mutasi" },
  { key: "acquisitionPrice", header: "Nilai Perolehan" },
  { key: "nilaiPenyusutan", header: "Nilai Penyusutan" },
  { key: "nilaiBuku", header: "Nilai Buku" },
  { key: "statusPenggunaan", header: "Status Penggunaan" },
  { key: "noPsp", header: "No PSP" },
  { key: "tanggalPsp", header: "Tanggal PSP" },
  { key: "kodeRegister", header: "Kode Register" },
] as const;

type SimanKey = Exclude<(typeof SIMAN_COLUMNS)[number]["key"], "no">;
export type ImportKey = (typeof IMPORT_COLUMNS)[number]["key"] | SimanKey;
/** A spreadsheet row. Columns this file does not know are kept as `cf:<header>` for the custom fields (lib/custom-fields/import.ts). */
export type RawRecord = Partial<Record<ImportKey, string>> & { [customColumn: `cf:${string}`]: string | undefined };

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_TO_KEY = new Map<string, ImportKey>(IMPORT_COLUMNS.map((c) => [squash(c.header), c.key]));
for (const column of SIMAN_COLUMNS) {
  if (column.key !== "no") HEADER_TO_KEY.set(squash(column.header), column.key);
}
// A few natural alternatives people type. "Kode Barang" is deliberately the SIMAN classification code
// (10 digits), not the system item code, which is the "Kode" column.
for (const [alias, key] of [
  ["nomorseri", "serialNumber"],
  ["noseri", "serialNumber"],
  ["tanggalperolehan", "acquisitionDate"],
  ["hargaperolehan", "acquisitionPrice"],
  ["jenis", "type"],
  ["namabarang", "name"],
  ["merek", "brand"],
  ["stokawal", "initialStock"],
  ["stokminimum", "minimumStock"],
  ["minimumstok", "minimumStock"],
] as const) {
  HEADER_TO_KEY.set(alias, key);
}

/** The Daftar Aset layout is recognised by its identity columns. */
export function isSimanHeaderSet(keys: Iterable<ImportKey>): boolean {
  const set = new Set(keys);
  return set.has("kodeBarang") && set.has("nup") && set.has("name");
}

export function headerToKey(header: string): ImportKey | undefined {
  return HEADER_TO_KEY.get(squash(header));
}

const CONDITION_WORDS: Record<string, string> = {
  baik: "GOOD",
  good: "GOOD",
  rusakringan: "MINOR_DAMAGE",
  minordamage: "MINOR_DAMAGE",
  rusakberat: "MAJOR_DAMAGE",
  majordamage: "MAJOR_DAMAGE",
};

export function mapCondition(value: string): string | undefined {
  return CONDITION_WORDS[squash(value)];
}

const MONTH_NUMBER: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

/**
 * "2024-03-15" stays as is; "15/03/2024", "15-03-2024" and "15 Mar 2024" (Indonesian or English month, as the export writes
 * dates) become ISO. Anything else is returned unchanged so validation reports it.
 */
export function normalizeDate(value: string): string {
  const trimmed = value.trim();
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const named = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(trimmed);
  const month = named ? MONTH_NUMBER[named[2].toLowerCase()] : undefined;
  if (named && month) return `${named[3]}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
  return trimmed;
}

export interface ImportLookups {
  categories: Map<string, string>; // `${TYPE}:${squash(name)}` -> id
  locations: Map<string, string>; // squash(name) -> id
  employees: Map<string, string>; // squash(name) or squash(employee number) -> id
}

export const lookupKey = squash;

export interface MappedRow {
  /** Fields for createItemSchema (all strings, as the form would send them). */
  candidate: Record<string, string>;
  /** Problems found while resolving names to ids, keyed by the spreadsheet column header. */
  errors: string[];
}

/** Turn one spreadsheet row into createItemSchema input, resolving category/location/PIC names to ids. */
export function mapRecord(record: RawRecord, lookups: ImportLookups): MappedRow {
  const errors: string[] = [];
  const get = (key: ImportKey) => (record[key] ?? "").trim();
  const header = (key: ImportKey) => IMPORT_COLUMNS.find((c) => c.key === key)!.header;

  const type = get("type").toUpperCase();
  const candidate: Record<string, string> = { type, name: get("name"), description: get("description") };

  const code = get("code");
  candidate.codeMode = code ? "manual" : "auto";
  if (code) candidate.code = code;

  const brand = get("brand");
  const model = get("model");
  if (brand) candidate.brand = brand;
  if (model) candidate.model = model;

  const category = get("category");
  if (category) {
    const id = lookups.categories.get(`${type}:${squash(category)}`);
    if (id) candidate.categoryId = id;
    else errors.push(`${header("category")}: kategori "${category}" untuk tipe ${type || "?"} tidak ditemukan.`);
  }

  const location = get("location");
  if (location) {
    const id = lookups.locations.get(squash(location));
    if (id) candidate.locationId = id;
    else errors.push(`${header("location")}: lokasi "${location}" tidak ditemukan.`);
  }

  if (type === "BMN") {
    const pic = get("pic");
    if (pic) {
      const id = lookups.employees.get(squash(pic));
      if (id) candidate.picId = id;
      else errors.push(`${header("pic")}: pegawai "${pic}" tidak ditemukan atau tidak aktif.`);
    }
    candidate.status = candidate.picId ? "IN_USE" : "AVAILABLE";

    const condition = get("condition");
    if (condition) {
      const mapped = mapCondition(condition);
      if (mapped) candidate.condition = mapped;
      else errors.push(`${header("condition")}: "${condition}" tidak dikenal. Gunakan Baik, Rusak ringan, atau Rusak berat.`);
    } else {
      candidate.condition = "GOOD";
    }

    const serial = get("serialNumber");
    if (serial) candidate.serialNumber = serial;
    const date = get("acquisitionDate");
    if (date) candidate.acquisitionDate = normalizeDate(date);
    const price = get("acquisitionPrice");
    if (price) candidate.acquisitionPrice = price;
    const funding = get("fundingSource");
    if (funding) candidate.fundingSource = funding;
  } else if (type === "ATK") {
    candidate.unit = get("unit");
    const stock = get("initialStock");
    if (stock) candidate.initialStock = stock;
    const min = get("minimumStock");
    if (min) candidate.minimumStock = min;
  }

  return { candidate, errors };
}
