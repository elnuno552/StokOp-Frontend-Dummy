import type { AuthContext } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import { users } from "@/lib/mock/data";
import { HYPER_ADMIN, SYSTEM_ROLE_DEFAULTS, canManageUsers, isProtectedRole } from "@/lib/permissions";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "@/validations/user";

type UserField = "name" | "username" | "email" | "role" | "password";

export type UserMutationResult =
  | { ok: true; userId: string; changed: boolean }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<UserField, string>> };

const ESCALATION_MESSAGE = "Hanya Hyper Admin yang dapat memberi atau mengubah akun Hyper Admin dan Super Admin.";

// Defense in depth: callers already use requireCapability("manage_users").
function assertCanManage(actor: AuthContext) {
  if (!canManageUsers(actor.role)) throw new AuthorizationError();
}

export async function listUsers(actor: AuthContext, query: UserListQuery) {
  assertCanManage(actor);

  const needle = query.q?.toLowerCase();
  const filtered = users
    .filter((u) => !query.role || u.role.name === query.role)
    .filter((u) => !query.status || u.isActive === (query.status === "active"))
    .filter((u) => !needle || [u.name, u.username, u.email].some((v) => v.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name, "id") || a.username.localeCompare(b.username));

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);

  return { rows: filtered.slice((page - 1) * query.pageSize, page * query.pageSize), total, page, pageCount, pageSize: query.pageSize };
}

export async function getUser(actor: AuthContext, id: string) {
  assertCanManage(actor);
  return users.find((u) => u.id === id) ?? null;
}

export async function listRoles() {
  return SYSTEM_ROLE_DEFAULTS.map((r) => ({ name: r.name, label: r.label || r.name }));
}

// Demo build: access rules are kept; nothing is stored.
export async function createUser(actor: AuthContext, input: CreateUserInput, _ipAddress: string | null): Promise<UserMutationResult> {
  assertCanManage(actor);
  if (isProtectedRole(input.role) && actor.role !== HYPER_ADMIN) return { ok: false, fieldErrors: { role: ESCALATION_MESSAGE } };
  const errors: Partial<Record<UserField, string>> = {};
  if (users.some((u) => u.username === input.username)) errors.username = "Username sudah digunakan.";
  if (users.some((u) => u.email === input.email)) errors.email = "Email sudah digunakan.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, userId: users[0].id, changed: true };
}

export async function updateUser(actor: AuthContext, id: string, input: UpdateUserInput, _ipAddress: string | null): Promise<UserMutationResult> {
  assertCanManage(actor);
  const target = users.find((u) => u.id === id);
  if (!target) return { ok: false, error: "Pengguna tidak ditemukan." };
  if ((isProtectedRole(target.role.name) || isProtectedRole(input.role)) && actor.role !== HYPER_ADMIN) return { ok: false, error: ESCALATION_MESSAGE };
  const errors: Partial<Record<UserField, string>> = {};
  if (users.some((u) => u.id !== id && u.username === input.username)) errors.username = "Username sudah digunakan.";
  if (users.some((u) => u.id !== id && u.email === input.email)) errors.email = "Email sudah digunakan.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, userId: id, changed: true };
}

/** Activate or deactivate an account. */
export async function setUserActive(actor: AuthContext, id: string, isActive: boolean, _ipAddress: string | null): Promise<UserMutationResult> {
  assertCanManage(actor);
  if (id === actor.id && !isActive) return { ok: false, error: "Anda tidak dapat menonaktifkan akun sendiri." };
  const target = users.find((u) => u.id === id);
  if (!target) return { ok: false, error: "Pengguna tidak ditemukan." };
  if (isProtectedRole(target.role.name) && actor.role !== HYPER_ADMIN) return { ok: false, error: ESCALATION_MESSAGE };
  return { ok: true, userId: id, changed: target.isActive !== isActive };
}

export type UserSummary = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Partial<Record<"currentPassword" | "password", string>>; error?: string };

/** Demo build: there are no passwords, so any change is accepted. */
export async function changeOwnPassword(
  _actor: AuthContext,
  _input: { currentPassword: string; password: string },
  _ipAddress: string | null,
): Promise<ChangePasswordResult> {
  return { ok: true };
}
