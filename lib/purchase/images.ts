import type { AuthContext } from "@/lib/auth/guards";

export type LineImageResult = { ok: true } | { ok: false; error: string; status: number };

const UNAVAILABLE: LineImageResult = { ok: false, error: "Unggah dan hapus foto tidak tersedia pada versi demo.", status: 501 };

// Demo build: there is no file storage.
export async function setLineImage(_actor: AuthContext, _planId: string, _lineId: string, _file: File, _ipAddress: string | null): Promise<LineImageResult> {
  return UNAVAILABLE;
}

export async function removeLineImage(_actor: AuthContext, _planId: string, _lineId: string, _ipAddress: string | null): Promise<LineImageResult> {
  return UNAVAILABLE;
}

/** All photos of a plan, keyed by line id, for the Excel export. None in the demo. */
export async function readPlanImages(_planId: string) {
  return new Map<string, { bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/heic" }>();
}
