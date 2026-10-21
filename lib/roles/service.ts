import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthContext } from "@/lib/auth/guards";
import { users } from "@/lib/mock/data";
import { canManageRoles, fixedCapabilities, SYSTEM_ROLE_DEFAULTS, type Capability } from "@/lib/permissions";
import type { CreateRoleInput, RoleInput } from "@/validations/role";

export type RoleResult = { ok: true; name?: string } | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

function assertCan(actor: AuthContext) {
  if (!canManageRoles(actor.role)) throw new AuthorizationError();
}

export interface RoleRow {
  name: string;
  label: string;
  isSystem: boolean;
  capabilities: Capability[];
  userCount: number;
}

export async function listRolesDetailed(actor: AuthContext): Promise<RoleRow[]> {
  assertCan(actor);
  return SYSTEM_ROLE_DEFAULTS.map((r) => ({
    name: r.name,
    label: r.label,
    isSystem: r.isSystem,
    capabilities: fixedCapabilities(r.name) ?? r.capabilities,
    userCount: users.filter((u) => u.role.name === r.name).length,
  }));
}

// Demo build: changes are accepted and not stored.
export async function createRole(actor: AuthContext, input: CreateRoleInput, _ipAddress: string | null): Promise<RoleResult> {
  assertCan(actor);
  if (SYSTEM_ROLE_DEFAULTS.some((r) => r.label.toLowerCase() === input.label.toLowerCase())) {
    return { ok: false, error: "Sudah ada peran dengan nama itu.", fieldErrors: { label: "Sudah ada peran dengan nama itu." } };
  }
  return { ok: true, name: input.label.toUpperCase().replace(/[^A-Z0-9]+/g, "_") };
}

export async function updateRole(actor: AuthContext, name: string, _input: RoleInput, _ipAddress: string | null): Promise<RoleResult> {
  assertCan(actor);
  if (fixedCapabilities(name)) return { ok: false, error: "Hyper Admin dan Super Admin memiliki kemampuan tetap dan tidak dapat diubah." };
  if (!SYSTEM_ROLE_DEFAULTS.some((r) => r.name === name)) return { ok: false, error: "Peran tidak ditemukan." };
  return { ok: true, name };
}

export async function deleteRole(actor: AuthContext, name: string, _ipAddress: string | null): Promise<RoleResult> {
  assertCan(actor);
  const role = SYSTEM_ROLE_DEFAULTS.find((r) => r.name === name);
  if (!role) return { ok: false, error: "Peran tidak ditemukan." };
  if (role.isSystem) return { ok: false, error: "Peran bawaan tidak dapat dihapus." };
  return { ok: true };
}
