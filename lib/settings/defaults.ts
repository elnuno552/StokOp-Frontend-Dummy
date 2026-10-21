// App settings that Super Admin can change. Pure (no I/O), so the settings page, the borrowing rules and the tests share it.
// Who may approve borrowing is no longer a setting: it is the `approve_borrowing` capability of a role (lib/permissions).

import type { ApprovalKindName } from "@/lib/approvals/rules";

export interface AppSettings {
  /** Borrowings due within this many days are shown as reminders. */
  reminderDays: number;
  /** Show ATK that is at or below its minimum on the Beranda. */
  lowStockEnabled: boolean;
  /** How many low-stock items the Beranda lists. */
  lowStockLimit: number;
  /** Actions that wait for someone with approve_requests (see lib/approvals). */
  approvalsRequired: ApprovalKindName[];
  /** Wrong passwords in a row before the account is locked for a while. */
  maxFailedAttempts: number;
  /** How long a locked account stays locked, in minutes. */
  lockMinutes: number;
  /** Shortest password accepted for new and reset passwords. */
  passwordMinLength: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  reminderDays: 3,
  lowStockEnabled: true,
  lowStockLimit: 10,
  approvalsRequired: [],
  maxFailedAttempts: 5,
  lockMinutes: 15,
  passwordMinLength: 8,
};

export const MAX_FAILED_ATTEMPTS_MIN = 3;
export const MAX_FAILED_ATTEMPTS_MAX = 20;
export const LOCK_MINUTES_MIN = 1;
export const LOCK_MINUTES_MAX = 1440;
// The upper bound is below bcrypt's 72-byte limit (see validations/user.ts).
export const PASSWORD_MIN_LENGTH_MIN = 6;
export const PASSWORD_MIN_LENGTH_MAX = 64;

export const LOW_STOCK_LIMIT_MIN = 1;
export const LOW_STOCK_LIMIT_MAX = 50;

export const REMINDER_DAYS_MIN = 0;
export const REMINDER_DAYS_MAX = 30;

export const SETTING_KEYS = {
  reminderDays: "borrowing.reminder_days",
  lowStockEnabled: "dashboard.low_stock_enabled",
  lowStockLimit: "dashboard.low_stock_limit",
  approvalsRequired: "approvals.required",
  maxFailedAttempts: "auth.max_failed_attempts",
  lockMinutes: "auth.lock_minutes",
  passwordMinLength: "auth.password_min_length",
} as const;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  // Number(null) and Number("") are 0, which would clamp a missing value to the minimum instead of the default.
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeMaxFailedAttempts(value: unknown): number {
  return clampInt(value, MAX_FAILED_ATTEMPTS_MIN, MAX_FAILED_ATTEMPTS_MAX, DEFAULT_SETTINGS.maxFailedAttempts);
}

export function normalizeLockMinutes(value: unknown): number {
  return clampInt(value, LOCK_MINUTES_MIN, LOCK_MINUTES_MAX, DEFAULT_SETTINGS.lockMinutes);
}

export function normalizePasswordMinLength(value: unknown): number {
  return clampInt(value, PASSWORD_MIN_LENGTH_MIN, PASSWORD_MIN_LENGTH_MAX, DEFAULT_SETTINGS.passwordMinLength);
}

export function normalizeLowStockEnabled(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_SETTINGS.lowStockEnabled;
}

export function normalizeLowStockLimit(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) return DEFAULT_SETTINGS.lowStockLimit;
  return Math.min(LOW_STOCK_LIMIT_MAX, Math.max(LOW_STOCK_LIMIT_MIN, n));
}

export function normalizeReminderDays(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) return DEFAULT_SETTINGS.reminderDays;
  return Math.min(REMINDER_DAYS_MAX, Math.max(REMINDER_DAYS_MIN, n));
}
