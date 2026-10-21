// Dates are rendered on the server, so the institution's time zone must be
// explicit rather than whatever the VPS is set to.
const timeZone = process.env.APP_TIMEZONE || "Asia/Jakarta";

const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone,
});

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone });

// Quantities are DECIMAL(18,3) in the database.
const quantityFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function formatQuantity(value: number): string {
  return quantityFormat.format(value);
}

const isoDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });

/** Today as YYYY-MM-DD in the app time zone. */
export function todayInAppZone(): string {
  return isoDateFormat.format(new Date());
}

/** The current year in the app time zone. */
export function currentYearInAppZone(): number {
  return Number(todayInAppZone().slice(0, 4));
}

const zonedParts = new Intl.DateTimeFormat("en-US", {
  timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Midnight at the start of `date` (YYYY-MM-DD) in the app time zone, plus `addDays`. */
export function startOfDayInAppZone(date: string, addDays = 0): Date {
  const utcMidnight = new Date(`${date}T00:00:00Z`);
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() + addDays);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(zonedParts.formatToParts(utcMidnight).find((p) => p.type === type)!.value);
  const wallClockAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  const offset = wallClockAsUtc - utcMidnight.getTime();
  return new Date(utcMidnight.getTime() - offset);
}

const rupiahFormat = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** Whole rupiah, e.g. "Rp 15.840.000". Sen are dropped for display only; stored values keep them. */
export function formatRupiah(value: number): string {
  return rupiahFormat.format(value);
}

const rupiahCompact = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 2 });

/** Short rupiah for headline figures, e.g. "Rp 9,33 M". Show the full amount next to it. */
export function formatRupiahCompact(value: number): string {
  return rupiahCompact.format(value);
}

const rupiahExact = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Rupiah keeping up to two decimals, e.g. "Rp 1.384.404,44". Used where the exact sum matters (RAB totals). */
export function formatRupiahExact(value: number): string {
  return rupiahExact.format(value);
}
