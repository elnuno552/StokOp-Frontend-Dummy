import { isIP } from "node:net";

// Minimum action set from CLAUDE_v2.md §20 / PRD §5.
export const HISTORY_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "STOCK_IN",
  "STOCK_OUT",
  "STOCK_ADJUSTMENT",
  "TRANSFER",
  "BORROW",
  "APPROVE",
  "REJECT",
  "RETURN",
  "MAINTENANCE",
] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

export interface HistoryLogEntry {
  /** Snapshot of the acting user; stored even if the user is later removed. */
  actor: { id: string; name: string; role: string };
  action: HistoryAction;
  module: string;
  referenceId?: string | null;
  description?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

/** Demo build: nothing is persisted, so a log entry is accepted and dropped. */
export async function writeHistoryLog(_db: unknown, _entry: HistoryLogEntry): Promise<void> {}

/**
 * Best-effort client IP. Behind Cloudflare, CF-Connecting-IP carries the real
 * client address; X-Forwarded-For is the fallback for other proxies.
 * Returns null for anything that is not a valid IP (the column is INET).
 */
export function getClientIp(headers: Headers): string | null {
  const candidate =
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0] ??
    headers.get("x-real-ip");
  const ip = candidate?.trim();
  return ip && isIP(ip) ? ip : null;
}
