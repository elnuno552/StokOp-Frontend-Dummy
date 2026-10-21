// Rules for a PIC typed in by hand because the person is not in Data master (Pegawai).
// Pure, so it is tested directly; lib/employees/manual-pic.ts applies the decision to the database.
import { nameKey, tidy } from "@/lib/master/names";

export const PIC_NAME_MAX = 150;

export interface KnownEmployee {
  id: string;
  name: string;
  isActive: boolean;
}

export type ManualPicDecision =
  /** Someone with this name is already in Data master: link to them instead of creating a duplicate. */
  | { kind: "reuse"; employeeId: string; name: string }
  /** Add the person to Data master as an active employee and link to them. */
  | { kind: "create"; name: string }
  /** Keep the name on the item only. */
  | { kind: "unsaved"; name: string }
  | { kind: "error"; error: string };

/**
 * Decide what a typed-in PIC name turns into.
 * An existing person with the same name is reused whether or not "save" was ticked: a second record for the
 * same person would only make the PIC list ambiguous. If that person is inactive they cannot be picked, so the
 * user is told to reactivate them rather than being given a duplicate.
 */
export function decideManualPic(rawName: unknown, save: boolean, employees: KnownEmployee[]): ManualPicDecision {
  const name = tidy(rawName);
  if (!name) return { kind: "error", error: "Isi nama PIC, atau pilih PIC dari daftar." };
  if (name.length > PIC_NAME_MAX) return { kind: "error", error: `Nama PIC maksimal ${PIC_NAME_MAX} karakter.` };
  const key = nameKey(name);
  if (!key) return { kind: "error", error: "Nama PIC harus memuat huruf atau angka." };

  const same = employees.filter((e) => nameKey(e.name) === key);
  const active = same.find((e) => e.isActive);
  if (active) return { kind: "reuse", employeeId: active.id, name: active.name };
  if (same.length > 0) return { kind: "error", error: `Pegawai "${same[0].name}" sudah ada tetapi nonaktif. Aktifkan dulu di Data master > Pegawai, lalu pilih dari daftar.` };

  return save ? { kind: "create", name } : { kind: "unsaved", name };
}

/** What gets stored on the item: a Data master employee or a typed-in name, never both. */
export interface PicAssignment {
  picId: string | null;
  picName: string | null;
}

export const NO_PIC: PicAssignment = { picId: null, picName: null };

/** The display name for an item's PIC: the Data master employee, else the typed-in name. */
export function picDisplayName(pic: { name: string } | null | undefined, picName: string | null | undefined): string | null {
  return pic?.name ?? picName ?? null;
}
