import "server-only";
import ExcelJS from "exceljs";
import { detectImageType } from "@/validations/item";
import { linePrice, lineTotal, planTotals } from "@/lib/purchase/calc";
import { parseIndonesianDate, parseMoney } from "@/lib/purchase/parse";
import type { PlanDetail } from "@/lib/purchase/service";

const longDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" });

// Column positions of the institution's sheet: B..K (A is an empty margin).
const COL = { no: 2, description: 3, volume: 4, unit: 5, unitPrice: 6, shipping: 7, price: 8, total: 9, image: 10, link: 11 } as const;
const HEADERS = ["No", "Uraian Barang", "Volume", "Satuan", "Harga Satuan", "Biaya Pengiriman", "Harga", "Jumlah", "Gambar", "Link"];
const FIRST_LINE_ROW = 5;

const letter = (col: number) => String.fromCharCode(64 + col);

export interface LineImage {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/heic";
}

/** Same layout as the sheet: title, date, header row, lines, then Jumlah / PPN / JUMLAH TOTAL / PEMBULATAN with live formulas. */
export async function exportPlanXlsx(plan: PlanDetail, images: Map<string, LineImage>): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("RAB ATK");
  const factor = plan.priceFactor;

  sheet.getCell("B2").value = plan.title;
  sheet.getCell("B2").font = { bold: true, size: 14 };
  sheet.getCell("B3").value = `Tanggal ${longDate.format(new Date(`${plan.planDate}T00:00:00Z`))}`;

  const headerRow = FIRST_LINE_ROW - 1;
  HEADERS.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, COL.no + i);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  });

  plan.lines.forEach((line, index) => {
    const r = FIRST_LINE_ROW + index;
    sheet.getCell(r, COL.no).value = index + 1;
    sheet.getCell(r, COL.description).value = line.description;
    sheet.getCell(r, COL.volume).value = line.volume;
    sheet.getCell(r, COL.unit).value = line.unit;
    sheet.getCell(r, COL.unitPrice).value = line.unitPrice;
    sheet.getCell(r, COL.shipping).value = line.shippingCost;
    // Live formulas, as in the source sheet, with the cached results so viewers that do not recalculate still show numbers.
    sheet.getCell(r, COL.price).value = {
      formula: `(${letter(COL.unitPrice)}${r}*${factor})+${letter(COL.shipping)}${r}/${letter(COL.volume)}${r}`,
      result: linePrice(line, factor),
    };
    sheet.getCell(r, COL.total).value = {
      formula: `${letter(COL.price)}${r}*${letter(COL.volume)}${r}`,
      result: lineTotal(line, factor),
    };
    if (line.link) sheet.getCell(r, COL.link).value = { text: line.link, hyperlink: line.link };

    const image = images.get(line.id);
    if (image && image.mimeType !== "image/heic") {
      const id = workbook.addImage({
        buffer: Buffer.from(image.bytes) as unknown as ExcelJS.Buffer,
        extension: image.mimeType === "image/png" ? "png" : "jpeg",
      });
      sheet.addImage(id, { tl: { col: COL.image - 1 + 0.1, row: r - 1 + 0.1 }, ext: { width: 64, height: 64 } });
      sheet.getRow(r).height = 52;
    }
  });

  const lastLine = FIRST_LINE_ROW + Math.max(plan.lines.length, 1) - 1;
  const totals = planTotals(plan.lines, factor, plan.ppnRate);
  const sumRow = lastLine + 1;
  const put = (row: number, label: string, value: ExcelJS.CellValue) => {
    sheet.getCell(row, COL.unitPrice).value = label;
    sheet.getCell(row, COL.unitPrice).font = { bold: true };
    sheet.getCell(row, COL.total).value = value;
  };
  put(sumRow, "Jumlah", { formula: `SUM(${letter(COL.total)}${FIRST_LINE_ROW}:${letter(COL.total)}${lastLine})`, result: totals.subtotal });
  put(sumRow + 1, `PPN ${plan.ppnRate}%`, { formula: `${plan.ppnRate}/100*${letter(COL.total)}${sumRow}`, result: totals.ppn });
  put(sumRow + 2, "JUMLAH TOTAL", { formula: `${letter(COL.total)}${sumRow}+${letter(COL.total)}${sumRow + 1}`, result: totals.total });
  put(sumRow + 3, "PEMBULATAN", plan.rounding ?? null);

  [COL.unitPrice, COL.shipping, COL.price, COL.total].forEach((col) => {
    sheet.getColumn(col).numFmt = "#,##0.00";
  });
  const widths: Record<number, number> = { 1: 3, 2: 5, 3: 60, 4: 9, 5: 10, 6: 16, 7: 18, 8: 16, 9: 18, 10: 12, 11: 50 };
  Object.entries(widths).forEach(([col, width]) => {
    sheet.getColumn(Number(col)).width = width;
  });
  sheet.getColumn(COL.description).alignment = { wrapText: true, vertical: "middle" };

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

export interface ParsedLine {
  rowNumber: number;
  description: string;
  volume: string;
  unit: string;
  unitPrice: string;
  shippingCost: string;
  link: string;
  image: { bytes: Uint8Array; mimeType: string; extension: string } | null;
}

export interface ParsedPlan {
  title: string;
  /** ISO date read from the "Tanggal ..." line, or null. */
  planDate: string | null;
  priceFactor: number;
  ppnRate: number;
  lines: ParsedLine[];
}

export class PlanFileError extends Error {}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((p) => p.text).join("").trim();
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String(value.text).trim();
    return "";
  }
  return String(value).trim();
}

/** A number cell as text for the line schema ("16900"), or the raw text when someone typed it. */
function numberText(value: ExcelJS.CellValue): string {
  if (typeof value === "number") return String(Math.round(value * 1000) / 1000).replace(".", ",");
  if (value && typeof value === "object" && "result" in value && typeof value.result === "number") return numberText(value.result);
  return cellText(value);
}

/** Read the first sheet of a RAB workbook in the institution's layout. Nothing is saved. */
export async function parsePlanWorkbook(buffer: Buffer): Promise<ParsedPlan> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new PlanFileError("File tidak dapat dibaca. Pastikan formatnya .xlsx yang valid.");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new PlanFileError("File tidak berisi sheet.");

  // Find the header row by its "Uraian Barang" cell and read the other columns from the same row.
  let headerRow = 0;
  const columns = new Map<string, number>();
  for (let r = 1; r <= Math.min(sheet.rowCount, 20) && !headerRow; r++) {
    const row = sheet.getRow(r);
    row.eachCell((cell) => {
      if (cellText(cell.value).toLowerCase() === "uraian barang") headerRow = r;
    });
    if (headerRow) row.eachCell((cell, col) => columns.set(cellText(cell.value).toLowerCase(), col));
  }
  if (!headerRow) throw new PlanFileError('Judul kolom "Uraian Barang" tidak ditemukan. Gunakan format RAB yang sama dengan template.');
  const need = (name: string) => {
    const col = columns.get(name);
    if (!col) throw new PlanFileError(`Kolom "${name}" tidak ditemukan pada baris judul.`);
    return col;
  };
  const cDesc = need("uraian barang");
  const cVolume = need("volume");
  const cUnit = need("satuan");
  const cPrice = need("harga satuan");
  const cShipping = columns.get("biaya pengiriman");
  const cHarga = columns.get("harga");
  const cLink = columns.get("link");

  // Title and date sit in the rows above the header.
  let title = "";
  let planDate: string | null = null;
  for (let r = 1; r < headerRow; r++) {
    sheet.getRow(r).eachCell((cell) => {
      const text = cellText(cell.value);
      if (!text) return;
      const date = parseIndonesianDate(text);
      if (date && !planDate && /tanggal/i.test(text)) planDate = date;
      else if (!title) title = text;
    });
  }

  let priceFactor = 1.15;
  let factorFound = false;
  let ppnRate = 11;
  const lines: ParsedLine[] = [];

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const description = cellText(row.getCell(cDesc).value);
    const priceCell = cellText(row.getCell(cPrice).value);

    // The totals block starts at the first row without a description; read the PPN percentage from it.
    if (!description) {
      const ppn = /ppn\s*(\d+(?:[.,]\d+)?)\s*%/i.exec(priceCell);
      if (ppn) ppnRate = Number(ppn[1].replace(",", "."));
      continue;
    }

    if (!factorFound && cHarga) {
      const raw = row.getCell(cHarga).value;
      const formula = raw && typeof raw === "object" && "formula" in raw ? String(raw.formula) : "";
      const factor = /\*\s*(\d+(?:\.\d+)?)/.exec(formula);
      if (factor) {
        priceFactor = Number(factor[1]);
        factorFound = true;
      }
    }

    lines.push({
      rowNumber: r,
      description,
      volume: numberText(row.getCell(cVolume).value),
      unit: cellText(row.getCell(cUnit).value),
      unitPrice: numberText(row.getCell(cPrice).value),
      shippingCost: cShipping ? numberText(row.getCell(cShipping).value) : "0",
      link: cLink ? cellText(row.getCell(cLink).value) : "",
      image: null,
    });
  }
  if (lines.length === 0) throw new PlanFileError("Tidak ada baris barang di bawah judul kolom.");

  // Embedded pictures belong to the row they are anchored on.
  const byRow = new Map(lines.map((l) => [l.rowNumber, l]));
  for (const placed of sheet.getImages()) {
    const row = Math.floor(placed.range.tl.nativeRow) + 1;
    const line = byRow.get(row);
    if (!line || line.image) continue;
    const media = workbook.getImage(Number(placed.imageId));
    if (!media?.buffer) continue;
    const bytes = new Uint8Array(media.buffer as ArrayBuffer);
    const detected = detectImageType(bytes);
    if (detected) line.image = { bytes, mimeType: detected.mimeType, extension: detected.extension };
  }

  return { title: title || "RAB Pembelian ATK", planDate, priceFactor, ppnRate, lines };
}

/** Text form of a number cell parsed with the same rules people use when typing (kept for tests and callers). */
export function moneyFromCell(text: string): number | null {
  const parsed = parseMoney(text);
  return parsed.ok ? parsed.value : null;
}
