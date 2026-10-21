import type { AuthContext } from "@/lib/auth/guards";
import { approvalGate, type ApprovalKindName } from "@/lib/approvals/rules";
import { getAppSettings } from "@/lib/settings/service";

/** Does this action have to wait for approval for this actor? */
export async function approvalRequired(actor: AuthContext, kind: ApprovalKindName): Promise<boolean> {
  const { approvalsRequired } = await getAppSettings();
  return approvalGate(kind, approvalsRequired, actor.role);
}

export type CreateApprovalResult = { ok: true; id: string } | { ok: false; error: string };

export const PENDING_NOTICE = "Permintaan diajukan dan menunggu persetujuan. Pantau di menu Persetujuan.";
