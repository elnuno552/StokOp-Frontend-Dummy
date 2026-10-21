import type { AuthContext } from "@/lib/auth/guards";
import { employees } from "@/lib/mock/data";
import { decideManualPic, type PicAssignment } from "./manual-pic-rules";

export type ManualPicResult = ({ ok: true; created: boolean } & PicAssignment) | { ok: false; error: string };

/** Demo build: decides what a typed-in PIC name turns into against the sample employees; nothing is created. */
export async function resolveManualPic(
  _tx: unknown,
  _actor: AuthContext,
  input: { name: string; save: boolean },
  _ipAddress: string | null,
): Promise<ManualPicResult> {
  const decision = decideManualPic(input.name, input.save, employees);
  switch (decision.kind) {
    case "error":
      return { ok: false, error: decision.error };
    case "reuse":
      return { ok: true, created: false, picId: decision.employeeId, picName: null };
    case "create":
      return { ok: true, created: true, picId: null, picName: decision.name };
    case "unsaved":
      return { ok: true, created: false, picId: null, picName: decision.name };
  }
}
