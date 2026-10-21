// The arithmetic of the "RAB Pembelian ATK" sheet, kept pure so the browser editor and the server
// use the very same formulas (and so they can be tested against the Excel numbers).
//
//   Harga  = HargaSatuan * faktor + BiayaPengiriman / Volume      (Excel: =(F5*1.15)+G5/D5)
//   Jumlah = Harga * Volume                                        (Excel: =H5*D5)
//   Subtotal = SUM(Jumlah);  PPN = ppn% / 100 * Subtotal;  Total = Subtotal + PPN
//
// Amounts are not rounded here: like the sheet, sums are taken over the unrounded values.

export interface PlanLineAmounts {
  volume: number;
  unitPrice: number;
  shippingCost: number;
}

/** Price per unit including the price factor and the shipping share. 0 when volume is not positive. */
export function linePrice(line: PlanLineAmounts, priceFactor: number): number {
  if (!(line.volume > 0)) return 0;
  return line.unitPrice * priceFactor + line.shippingCost / line.volume;
}

export function lineTotal(line: PlanLineAmounts, priceFactor: number): number {
  return linePrice(line, priceFactor) * line.volume;
}

export interface PlanTotals {
  subtotal: number;
  ppn: number;
  total: number;
}

export function planTotals(lines: PlanLineAmounts[], priceFactor: number, ppnRate: number): PlanTotals {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line, priceFactor), 0);
  const ppn = (ppnRate / 100) * subtotal;
  return { subtotal, ppn, total: subtotal + ppn };
}

/** A price factor of 1.15 is shown as 15 (percent added). */
export function factorToPercent(factor: number): number {
  return Math.round((factor - 1) * 10000) / 100;
}

export function percentToFactor(percent: number): number {
  return Math.round((1 + percent / 100) * 10000) / 10000;
}
