import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { formatDateTime, startOfDayInAppZone } from "@/lib/format";
import { historyLogs } from "@/lib/mock/data";
import { canAccessHistoryLog } from "@/lib/permissions";
import { HISTORY_PAGE_SIZE, type HistoryQuery } from "@/validations/history";

/** History Log is append-only and visible to the roles with view_history. */
export async function listHistory(actor: AuthContext, query: HistoryQuery) {
  if (!canAccessHistoryLog(actor.role)) throw new AuthorizationError();

  const needle = query.q?.toLowerCase();
  const from = query.from ? startOfDayInAppZone(query.from) : null;
  const to = query.to ? startOfDayInAppZone(query.to, 1) : null;
  const filtered = historyLogs
    .filter((r) => !query.module || r.module === query.module)
    .filter((r) => !query.action || r.action === query.action)
    .filter((r) => !from || r.createdAt >= from)
    .filter((r) => !to || r.createdAt < to)
    .filter((r) => !needle || r.description.toLowerCase().includes(needle) || r.userName.toLowerCase().includes(needle))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);

  return {
    total,
    page,
    pageCount,
    modules: [...new Set(historyLogs.map((r) => r.module))].sort(),
    rows: filtered.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE).map((r) => ({
      id: r.id,
      createdAtLabel: formatDateTime(r.createdAt),
      userName: r.userName,
      role: r.role,
      action: r.action,
      module: r.module,
      description: r.description,
      ipAddress: r.ipAddress,
      oldValue: r.oldValue === null ? null : JSON.stringify(r.oldValue, null, 2),
      newValue: r.newValue === null ? null : JSON.stringify(r.newValue, null, 2),
    })),
  };
}
