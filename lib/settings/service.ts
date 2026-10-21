import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { normalizeApprovalKinds } from "@/lib/approvals/rules";
import { canManageSettings } from "@/lib/permissions";
import {
  DEFAULT_SETTINGS,
  normalizeLockMinutes,
  normalizeLowStockLimit,
  normalizeMaxFailedAttempts,
  normalizePasswordMinLength,
  normalizeReminderDays,
  type AppSettings,
} from "@/lib/settings/defaults";

// Demo build: settings are the defaults plus two approval rules so the Persetujuan menu has something to show.
// Saving validates the input and echoes it back; nothing is stored.
const DEMO_SETTINGS: AppSettings = { ...DEFAULT_SETTINGS, approvalsRequired: ["STOCK_ADJUSTMENT", "BMN_TRANSFER"] };

export async function getAppSettings(): Promise<AppSettings> {
  return DEMO_SETTINGS;
}

/** Validate the settings (needs the manage_settings capability); nothing is stored in the demo. */
export async function saveAppSettings(
  actor: AuthContext,
  input: { reminderDays: unknown; lowStockEnabled: unknown; lowStockLimit: unknown; approvalsRequired: unknown },
  _ipAddress: string | null,
): Promise<AppSettings> {
  if (!canManageSettings(actor.role)) throw new AuthorizationError();
  return {
    ...DEMO_SETTINGS,
    reminderDays: normalizeReminderDays(input.reminderDays),
    lowStockEnabled: input.lowStockEnabled === true,
    lowStockLimit: normalizeLowStockLimit(input.lowStockLimit),
    approvalsRequired: normalizeApprovalKinds(input.approvalsRequired),
  };
}

/** Validate the sign-in security settings (needs manage_settings); nothing is stored in the demo. */
export async function saveSecuritySettings(
  actor: AuthContext,
  input: { maxFailedAttempts: unknown; lockMinutes: unknown; passwordMinLength: unknown },
  _ipAddress: string | null,
): Promise<Pick<AppSettings, "maxFailedAttempts" | "lockMinutes" | "passwordMinLength">> {
  if (!canManageSettings(actor.role)) throw new AuthorizationError();
  return {
    maxFailedAttempts: normalizeMaxFailedAttempts(input.maxFailedAttempts),
    lockMinutes: normalizeLockMinutes(input.lockMinutes),
    passwordMinLength: normalizePasswordMinLength(input.passwordMinLength),
  };
}
