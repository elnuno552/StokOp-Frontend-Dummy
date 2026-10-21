import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { categories, employees, items, locations, borrowings } from "@/lib/mock/data";
import { canMutateInventory, canViewOperations } from "@/lib/permissions";
import type { CategoryInput, EmployeeInput, LocationInput, MasterEntity } from "@/validations/master";

export type MasterResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

/** Locations and employees are shared by BMN and ATK; categories belong to one type. */
export function canManageMaster(actor: AuthContext, entity: MasterEntity, categoryType?: ItemType): boolean {
  if (entity === "categories" && categoryType) return canMutateInventory(actor.role, categoryType);
  return canMutateInventory(actor.role, "BMN") || canMutateInventory(actor.role, "ATK");
}

export async function listMaster(actor: AuthContext, entity: MasterEntity) {
  if (!canViewOperations(actor.role)) throw new AuthorizationError();
  if (entity === "locations") {
    return [...locations]
      .sort((a, b) => (a.building ?? "").localeCompare(b.building ?? "") || (a.floor ?? "").localeCompare(b.floor ?? "") || a.name.localeCompare(b.name, "id"))
      .map((r) => {
        const used = items.filter((i) => i.locationId === r.id).length;
        return {
          id: r.id,
          cells: [r.name, [r.building, r.floor && `Lantai ${r.floor}`, r.room && `Ruang ${r.room}`].filter(Boolean).join(" · ") || "—", String(used)],
          values: { name: r.name, building: r.building ?? "", floor: r.floor ?? "", room: r.room ?? "", description: r.description ?? "" } as Record<string, string>,
          used,
          type: null as ItemType | null,
        };
      });
  }
  if (entity === "categories") {
    return [...categories]
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "id"))
      .map((r) => {
        const used = items.filter((i) => i.categoryId === r.id).length;
        return {
          id: r.id,
          cells: [r.name, r.type, String(used)],
          values: { name: r.name, type: r.type, description: r.description ?? "" } as Record<string, string>,
          used,
          type: r.type as ItemType | null,
        };
      });
  }
  return [...employees]
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((r) => ({
      id: r.id,
      cells: [r.name, r.employeeNumber ?? "—", r.golongan ?? "—", r.position ?? "—", r.workLocation ?? "—", r.isActive ? "Aktif" : "Nonaktif"],
      values: {
        employeeNumber: r.employeeNumber ?? "",
        name: r.name,
        unit: r.unit ?? "",
        golongan: r.golongan ?? "",
        position: r.position ?? "",
        workLocation: r.workLocation ?? "",
        phone: r.phone ?? "",
        email: r.email ?? "",
        isActive: r.isActive ? "on" : "",
      } as Record<string, string>,
      used: items.filter((i) => i.picId === r.id).length + borrowings.filter((b) => b.borrowerId === r.id).length,
      type: null as ItemType | null,
    }));
}

export type MasterRow = Awaited<ReturnType<typeof listMaster>>[number];

// Demo build: changes are accepted and not stored.
export async function saveMaster(
  actor: AuthContext,
  entity: MasterEntity,
  _id: string | null,
  data: LocationInput | CategoryInput | EmployeeInput,
  _ipAddress: string | null,
): Promise<MasterResult> {
  if (!canManageMaster(actor, entity, entity === "categories" ? (data as CategoryInput).type : undefined)) {
    return { ok: false, error: "Anda tidak berwenang mengelola data ini." };
  }
  return { ok: true };
}

export async function deleteMaster(actor: AuthContext, entity: MasterEntity, id: string, _ipAddress: string | null): Promise<MasterResult> {
  if (!canManageMaster(actor, entity)) return { ok: false, error: "Anda tidak berwenang mengelola data ini." };
  const used =
    entity === "locations" ? items.filter((i) => i.locationId === id).length : entity === "categories" ? items.filter((i) => i.categoryId === id).length : items.filter((i) => i.picId === id).length;
  if (used > 0) return { ok: false, error: "Data ini masih dipakai barang, jadi tidak dapat dihapus." };
  return { ok: true };
}
