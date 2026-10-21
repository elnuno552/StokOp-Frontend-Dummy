// Permission rules (no I/O). Roles are data: each role in the `roles` table holds a list of capabilities that
// Hyper Admin edits in Pengaturan. The table is loaded by lib/permissions/load.ts into a process-wide cache, so the
// can*() helpers stay synchronous and keep their signatures. Without a loaded table (unit tests) the built-in
// defaults below apply. Enforce server-side through lib/auth/guards.ts; hiding UI is not authorization.
import type { ItemType } from "@/lib/generated/prisma/enums";

/** Everything a role can be granted. Reading inventory is implied for every known role. */
export const CAPABILITIES = [
  "mutate_bmn",
  "mutate_atk",
  "view_operations",
  "manage_users",
  "manage_settings",
  "view_history",
  "approve_borrowing",
  "approve_requests",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_INFO: Record<Capability, { label: string; hint: string }> = {
  mutate_bmn: { label: "Mengelola BMN", hint: "Tambah, ubah, hapus, pindah, pinjamkan, rawat, hilang dan penghapusan aset BMN." },
  mutate_atk: { label: "Mengelola ATK dan stok", hint: "Tambah, ubah, hapus barang ATK; stok masuk, keluar, penyesuaian; RAB." },
  view_operations: { label: "Melihat menu operasional", hint: "Peminjaman, Stock opname, Rencana pembelian, Data master." },
  manage_users: { label: "Mengelola pengguna", hint: "Membuat dan mengubah akun. Hanya Hyper Admin yang dapat memberi peran Super Admin atau Hyper Admin." },
  manage_settings: { label: "Mengubah pengaturan", hint: "Pengaturan sistem, stok minimum, kolom kustom, aturan persetujuan. Peran dan hak akses tetap hanya Hyper Admin." },
  view_history: { label: "Melihat History Log", hint: "Catatan audit seluruh perubahan." },
  approve_borrowing: { label: "Menyetujui peminjaman", hint: "Peminjaman langsung aktif; peran lain mengajukan dan menunggu persetujuan." },
  approve_requests: { label: "Menyetujui permintaan lain", hint: "Penghapusan aset, penyesuaian stok, penerimaan RAB, dan pemindahan lokasi yang diwajibkan persetujuan." },
};

export function isCapability(value: unknown): value is Capability {
  return typeof value === "string" && (CAPABILITIES as readonly string[]).includes(value);
}

/** Keep only known capabilities, once each, in the canonical order. */
export function normalizeCapabilities(value: unknown): Capability[] {
  const list = Array.isArray(value) ? value : [];
  return CAPABILITIES.filter((c) => list.includes(c));
}

/** A role name. Built-in roles are the five below; Hyper Admin may add others. */
export type RoleName = string;

export const HYPER_ADMIN = "HYPER_ADMIN";
export const SUPER_ADMIN = "SUPER_ADMIN";

/** Super Admin holds everything except user management, which (like role settings) belongs to Hyper Admin. */
export const SUPER_ADMIN_CAPABILITIES: readonly Capability[] = CAPABILITIES.filter((c) => c !== "manage_users");

/** Capabilities of the two roles whose rights are fixed in code, whatever the `roles` table says. */
export function fixedCapabilities(role: unknown): Capability[] | undefined {
  if (role === HYPER_ADMIN) return [...CAPABILITIES];
  if (role === SUPER_ADMIN) return [...SUPER_ADMIN_CAPABILITIES];
  return undefined;
}

/** Only Hyper Admin may create, edit, activate or deactivate accounts holding one of these roles. */
export function isProtectedRole(role: unknown): boolean {
  return role === HYPER_ADMIN || role === SUPER_ADMIN;
}

export interface RoleDef {
  name: string;
  label: string;
  isSystem: boolean;
  capabilities: Capability[];
}

/** Built-in roles and their starting capabilities (the migration writes the same values). */
export const SYSTEM_ROLE_DEFAULTS: readonly RoleDef[] = [
  { name: "HYPER_ADMIN", label: "Hyper Admin", isSystem: true, capabilities: [...CAPABILITIES] },
  { name: "SUPER_ADMIN", label: "Super Admin", isSystem: true, capabilities: [...SUPER_ADMIN_CAPABILITIES] },
  { name: "ADMIN_BMN", label: "Admin BMN", isSystem: true, capabilities: ["mutate_bmn", "view_operations", "approve_borrowing"] },
  { name: "ADMIN_ATK", label: "Admin ATK", isSystem: true, capabilities: ["mutate_atk", "view_operations"] },
  { name: "STAFF", label: "Staf", isSystem: true, capabilities: [] },
];

// Shared through globalThis: Next bundles server code into several module graphs (pages, route handlers).
type RoleCache = { loadedAt: number; roles: Map<string, RoleDef> };
const holder = globalThis as { __stokopRoleCache?: RoleCache };

export function setRoleTable(defs: readonly RoleDef[]) {
  holder.__stokopRoleCache = { loadedAt: Date.now(), roles: new Map(defs.map((d) => [d.name, d])) };
}

export function clearRoleTable() {
  holder.__stokopRoleCache = undefined;
}

/** Milliseconds since the table was loaded, or null when none is loaded. */
export function roleTableAge(): number | null {
  return holder.__stokopRoleCache ? Date.now() - holder.__stokopRoleCache.loadedAt : null;
}

function defOf(role: unknown): RoleDef | undefined {
  if (typeof role !== "string") return undefined;
  return holder.__stokopRoleCache?.roles.get(role) ?? (holder.__stokopRoleCache ? undefined : SYSTEM_ROLE_DEFAULTS.find((d) => d.name === role));
}

export function isRoleName(value: unknown): value is RoleName {
  return defOf(value) !== undefined;
}

export function roleLabel(role: unknown): string {
  const def = defOf(role);
  return def?.label || (typeof role === "string" ? role : "");
}

/** Hyper Admin always has every capability and Super Admin a fixed set; an unknown role has none. */
export function hasCapability(role: unknown, capability: Capability): boolean {
  const fixed = fixedCapabilities(role);
  if (fixed) return fixed.includes(capability);
  return defOf(role)?.capabilities.includes(capability) ?? false;
}

export type InventoryAccessMode = "read" | "mutate";

/** Every known role can read all inventory (BMN and ATK). */
export function canReadInventory(role: RoleName): boolean {
  return isRoleName(role);
}

export function canMutateInventory(role: RoleName, type: ItemType): boolean {
  return hasCapability(role, type === "BMN" ? "mutate_bmn" : "mutate_atk");
}

export function canAccessInventory(role: RoleName, type: ItemType, mode: InventoryAccessMode): boolean {
  return mode === "read" ? canReadInventory(role) : canMutateInventory(role, type);
}

/** User menu (list/create/edit/deactivate/assign role). */
export function canManageUsers(role: RoleName): boolean {
  return hasCapability(role, "manage_users");
}

export function canAccessHistoryLog(role: RoleName): boolean {
  return hasCapability(role, "view_history");
}

/** Operational screens: borrowing list, stock opname, purchase plans, master data. */
export function canViewOperations(role: RoleName): boolean {
  return isRoleName(role) && hasCapability(role, "view_operations");
}

/** Roles with this capability lend directly; for every other role a loan becomes a request. */
export function canApproveBorrowing(role: RoleName): boolean {
  return hasCapability(role, "approve_borrowing");
}

/** Approve disposal decisions, stock adjustments, RAB receipts and BMN moves that need approval. */
export function canApproveRequests(role: RoleName): boolean {
  return hasCapability(role, "approve_requests");
}

/** System settings, stock minimums, custom fields, approval rules. */
export function canManageSettings(role: RoleName): boolean {
  return hasCapability(role, "manage_settings");
}

/** Roles and their capabilities are edited by Hyper Admin only, so no one can grant themselves more power. */
export function canManageRoles(role: RoleName): boolean {
  return role === HYPER_ADMIN;
}
