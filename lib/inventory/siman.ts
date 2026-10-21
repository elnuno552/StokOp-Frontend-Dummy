// Pure logic for the SIMAN "Daftar Aset" format: turning a spreadsheet row into normalized BMN
// fields, and comparing them with what is already stored. No I/O, so it is unit tested directly.
import { mapCondition, normalizeDate, type RawRecord } from "@/lib/inventory/import-map";

export type SimanCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";

/** Everything the register file owns for one asset, in the shape the database stores. */
export interface SimanFields {
  categoryName: string | null;
  kodeSatker: string | null;
  kodeBarang: string;
  nup: number;
  kodeRegister: string | null;
  name: string;
  brand: string | null;
  condition: SimanCondition;
  umurAset: number | null;
  tanggalBukuPertama: string | null;
  acquisitionDate: string | null;
  nilaiPerolehanPertama: number | null;
  nilaiMutasi: number | null;
  acquisitionPrice: number | null;
  nilaiPenyusutan: number | null;
  nilaiBuku: number | null;
  statusPenggunaan: string | null;
  noPsp: string | null;
  tanggalPsp: string | null;
}

/** Fields compared on re-import, with the label shown in the preview. Location, PIC and status are never touched. */
export const SIMAN_TRACKED_FIELDS: { key: Exclude<keyof SimanFields, "kodeSatker" | "kodeBarang" | "nup">; label: string }[] = [
  { key: "categoryName", label: "Jenis BMN" },
  { key: "kodeRegister", label: "Kode Register" },
  { key: "name", label: "Nama Barang" },
  { key: "brand", label: "Merk" },
  { key: "condition", label: "Kondisi" },
  { key: "umurAset", label: "Umur Aset" },
  { key: "tanggalBukuPertama", label: "Tanggal Buku Pertama" },
  { key: "acquisitionDate", label: "Tanggal Perolehan" },
  { key: "nilaiPerolehanPertama", label: "Nilai Perolehan Pertama" },
  { key: "nilaiMutasi", label: "Nilai Mutasi" },
  { key: "acquisitionPrice", label: "Nilai Perolehan" },
  { key: "nilaiPenyusutan", label: "Nilai Penyusutan" },
  { key: "nilaiBuku", label: "Nilai Buku" },
  { key: "statusPenggunaan", label: "Status Penggunaan" },
  { key: "noPsp", label: "No PSP" },
  { key: "tanggalPsp", label: "Tanggal PSP" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export interface ParsedSiman {
  fields: SimanFields | null;
  errors: string[];
}

/** Validate and normalize one spreadsheet row. Messages name the spreadsheet column. */
export function parseSimanRecord(record: RawRecord): ParsedSiman {
  const errors: string[] = [];
  const get = (key: keyof RawRecord) => (record[key] ?? "").trim();

  const text = (key: keyof RawRecord, header: string, max: number): string | null => {
    const value = get(key);
    if (!value) return null;
    if (value.length > max) {
      errors.push(`${header}: maksimal ${max} karakter.`);
      return null;
    }
    return value;
  };
  const date = (key: keyof RawRecord, header: string): string | null => {
    const raw = get(key);
    if (!raw) return null;
    const iso = normalizeDate(raw);
    if (!validIsoDate(iso)) {
      errors.push(`${header}: tanggal "${raw}" tidak valid (gunakan YYYY-MM-DD atau DD/MM/YYYY).`);
      return null;
    }
    return iso;
  };
  const money = (key: keyof RawRecord, header: string, allowNegative = false): number | null => {
    const raw = get(key);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || Math.abs(value) >= 1e15 || (!allowNegative && value < 0)) {
      errors.push(`${header}: "${raw}" bukan angka ${allowNegative ? "" : "≥ 0 "}yang valid.`);
      return null;
    }
    return round2(value);
  };
  const whole = (key: keyof RawRecord, header: string, min: number): number | null => {
    const raw = get(key);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min) {
      errors.push(`${header}: harus bilangan bulat ≥ ${min}.`);
      return null;
    }
    return value;
  };

  const name = text("name", "Nama Barang", 255);
  if (!name && !errors.some((e) => e.startsWith("Nama Barang"))) errors.push("Nama Barang: wajib diisi.");

  const kodeBarang = text("kodeBarang", "Kode Barang", 20);
  if (!kodeBarang && !errors.some((e) => e.startsWith("Kode Barang"))) errors.push("Kode Barang: wajib diisi.");

  const nup = whole("nup", "NUP", 1);
  if (nup === null && !errors.some((e) => e.startsWith("NUP"))) errors.push("NUP: wajib diisi (bilangan bulat ≥ 1).");

  let condition: SimanCondition = "GOOD";
  const rawCondition = get("condition");
  if (rawCondition) {
    const mapped = mapCondition(rawCondition);
    if (mapped === "GOOD" || mapped === "MINOR_DAMAGE" || mapped === "MAJOR_DAMAGE") condition = mapped;
    else errors.push(`Kondisi: "${rawCondition}" tidak dikenal. Gunakan Baik, Rusak Ringan, atau Rusak Berat.`);
  }

  const fields: SimanFields = {
    categoryName: text("category", "Jenis BMN", 150),
    kodeSatker: text("kodeSatker", "Kode Satker", 50),
    kodeBarang: kodeBarang ?? "",
    nup: nup ?? 0,
    kodeRegister: text("kodeRegister", "Kode Register", 64),
    name: name ?? "",
    brand: text("brand", "Merk", 150),
    condition,
    umurAset: whole("umurAset", "Umur Aset", 0),
    tanggalBukuPertama: date("tanggalBukuPertama", "Tanggal Buku Pertama"),
    acquisitionDate: date("acquisitionDate", "Tanggal Perolehan"),
    nilaiPerolehanPertama: money("nilaiPerolehanPertama", "Nilai Perolehan Pertama"),
    nilaiMutasi: money("nilaiMutasi", "Nilai Mutasi", true),
    acquisitionPrice: money("acquisitionPrice", "Nilai Perolehan"),
    nilaiPenyusutan: money("nilaiPenyusutan", "Nilai Penyusutan"),
    nilaiBuku: money("nilaiBuku", "Nilai Buku"),
    statusPenggunaan: text("statusPenggunaan", "Status Penggunaan", 150),
    noPsp: text("noPsp", "No PSP", 100),
    tanggalPsp: date("tanggalPsp", "Tanggal PSP"),
  };

  return { fields: errors.length === 0 ? fields : null, errors };
}

/** Identity of an asset inside one Satker. */
export function assetKey(fields: Pick<SimanFields, "kodeSatker" | "kodeBarang" | "nup">): string {
  return `${fields.kodeSatker ?? ""}|${fields.kodeBarang}|${fields.nup}`;
}

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/** Labels of the tracked fields that differ. Empty means the row changes nothing. */
export function diffSiman(existing: SimanFields, incoming: SimanFields): string[] {
  return SIMAN_TRACKED_FIELDS.filter(({ key }) => {
    if (key === "categoryName") {
      return (existing.categoryName ?? "").toLowerCase() !== (incoming.categoryName ?? "").toLowerCase();
    }
    // A blank cell in the file does not erase a value that is already stored.
    if (incoming[key] === null) return false;
    return !same(existing[key], incoming[key]);
  }).map(({ label }) => label);
}
