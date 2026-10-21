import "server-only";
import ExcelJS from "exceljs";
import { picDisplayName } from "@/lib/employees/manual-pic-rules";
import type { ExportItem } from "@/lib/inventory/list";
import { ITEM_CONDITION_LABELS, ITEM_STATUS_LABELS } from "@/lib/inventory/labels";

// Export includes every field of the item, not only the columns visible on screen.
const COLUMNS: { header: string; width: number; value: (item: ExportItem) => string | number | Date | null }[] = [
  { header: "Kode", width: 18, value: (i) => i.code },
  { header: "Nama", width: 36, value: (i) => i.name },
  { header: "Tipe", width: 8, value: (i) => i.type },
  { header: "Kategori", width: 22, value: (i) => i.category?.name ?? null },
  { header: "Lokasi", width: 22, value: (i) => i.location?.name ?? null },
  { header: "PIC", width: 22, value: (i) => picDisplayName(i.pic, i.picName) },
  { header: "Jumlah", width: 10, value: (i) => Number(i.quantity) },
  { header: "Satuan", width: 10, value: (i) => i.unit },
  { header: "Stok minimum", width: 14, value: (i) => (i.minimumStock === null ? null : Number(i.minimumStock)) },
  { header: "Status", width: 16, value: (i) => ITEM_STATUS_LABELS[i.status] },
  { header: "Kondisi", width: 14, value: (i) => ITEM_CONDITION_LABELS[i.condition] },
  { header: "Merek", width: 16, value: (i) => i.brand },
  { header: "Model", width: 18, value: (i) => i.model },
  { header: "No. seri", width: 18, value: (i) => i.serialNumber },
  { header: "Tanggal perolehan", width: 18, value: (i) => i.acquisitionDate },
  { header: "Harga perolehan", width: 18, value: (i) => (i.acquisitionPrice === null ? null : Number(i.acquisitionPrice)) },
  { header: "Sumber dana", width: 16, value: (i) => i.fundingSource },
  { header: "Keterangan", width: 36, value: (i) => i.description },
  { header: "Ditambahkan", width: 20, value: (i) => i.createdAt },
];

/** Extra columns appended after the standard ones (custom fields). */
export interface ExtraColumn {
  header: string;
  width: number;
  value: (item: ExportItem) => string | number | Date | null;
}

function csvCell(value: string | number | Date | null): string {
  if (value === null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Quote when needed; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(items: ExportItem[], extra: ExtraColumn[] = []): string {
  const columns = [...COLUMNS, ...extra];
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const item of items) lines.push(columns.map((c) => csvCell(c.value(item))).join(","));
  // BOM so Excel opens UTF-8 correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export async function toXlsx(items: ExportItem[], extra: ExtraColumn[] = []): Promise<ArrayBuffer> {
  const columns = [...COLUMNS, ...extra];
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Inventaris", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  for (const item of items) sheet.addRow(columns.map((c) => c.value(item)));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.getColumn(15).numFmt = "dd/mm/yyyy";
  sheet.getColumn(16).numFmt = "#,##0.00";
  sheet.getColumn(19).numFmt = "dd/mm/yyyy hh:mm";
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

// ---------------------------------------------------------------------------
// "Format Daftar Aset": the same 20 columns, in the same order, as the SIMAN export the institution uses.
// ---------------------------------------------------------------------------

// SIMAN capitalises every word of the condition.
const REGISTER_CONDITION: Record<ExportItem["condition"], string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat",
  LOST: "Hilang",
};

const money = (value: { toString(): string } | null) => (value === null ? null : Number(value));

const REGISTER_COLUMNS: { header: string; width: number; numFmt?: string; value: (item: ExportItem, no: number) => string | number | Date | null }[] = [
  { header: "No", width: 6, value: (_i, no) => no },
  { header: "Jenis BMN", width: 30, value: (i) => i.category?.name ?? null },
  { header: "Kode Satker", width: 24, value: (i) => i.kodeSatker },
  { header: "Kode Barang", width: 14, value: (i) => i.kodeBarang },
  { header: "NUP", width: 7, value: (i) => i.nup },
  { header: "Nama Barang", width: 36, value: (i) => i.name },
  { header: "Merk", width: 36, value: (i) => i.brand },
  { header: "Kondisi", width: 14, value: (i) => REGISTER_CONDITION[i.condition] },
  { header: "Umur Aset", width: 10, value: (i) => i.umurAset },
  { header: "Tanggal Buku Pertama", width: 20, numFmt: "dd/mm/yyyy", value: (i) => i.tanggalBukuPertama },
  { header: "Tanggal Perolehan", width: 18, numFmt: "dd/mm/yyyy", value: (i) => i.acquisitionDate },
  { header: "Nilai Perolehan Pertama", width: 22, numFmt: "#,##0.00", value: (i) => money(i.nilaiPerolehanPertama) },
  { header: "Nilai Mutasi", width: 16, numFmt: "#,##0.00", value: (i) => money(i.nilaiMutasi) },
  { header: "Nilai Perolehan", width: 18, numFmt: "#,##0.00", value: (i) => money(i.acquisitionPrice) },
  { header: "Nilai Penyusutan", width: 18, numFmt: "#,##0.00", value: (i) => money(i.nilaiPenyusutan) },
  { header: "Nilai Buku", width: 16, numFmt: "#,##0.00", value: (i) => money(i.nilaiBuku) },
  { header: "Status Penggunaan", width: 36, value: (i) => i.statusPenggunaan },
  { header: "No PSP", width: 24, value: (i) => i.noPsp },
  { header: "Tanggal PSP", width: 14, numFmt: "dd/mm/yyyy", value: (i) => i.tanggalPsp },
  { header: "Kode Register", width: 36, value: (i) => i.kodeRegister },
];

/** BMN only, ordered like the register: by Kode Barang, then Satker, then NUP. */
export async function toAssetRegisterXlsx(items: ExportItem[]): Promise<ArrayBuffer> {
  const rows = items
    .filter((i) => i.type === "BMN")
    .sort(
      (a, b) =>
        (a.kodeBarang ?? "").localeCompare(b.kodeBarang ?? "") ||
        (a.kodeSatker ?? "").localeCompare(b.kodeSatker ?? "") ||
        (a.nup ?? 0) - (b.nup ?? 0) ||
        a.code.localeCompare(b.code),
    );

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Master Aset", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = REGISTER_COLUMNS.map((c) => ({ header: c.header, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((item, index) => sheet.addRow(REGISTER_COLUMNS.map((c) => c.value(item, index + 1))));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: REGISTER_COLUMNS.length } };
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

export const ASSET_REGISTER_HEADERS = REGISTER_COLUMNS.map((c) => c.header);
