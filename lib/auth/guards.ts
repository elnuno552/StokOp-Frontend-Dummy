import type { ItemType } from "@/lib/generated/prisma/enums";
import { auth, type DemoUser } from "@/lib/auth";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import {
  canAccessInventory,
  hasCapability,
  type Capability,
  type InventoryAccessMode,
  type RoleName,
} from "@/lib/permissions";

export interface AuthContext {
  id: string;
  name: string;
  username: string;
  email: string;
  role: RoleName;
}

/** Signed-in demo user. Throws AuthenticationError (401) without the demo cookie. */
export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session) throw new AuthenticationError();
  const { id, name, username, email, role }: DemoUser = session.user;
  return { id, name, username, email, role };
}

/** Require one of the given roles. Throws 401 or AuthorizationError (403). */
export async function requireRole(...roles: RoleName[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.role)) throw new AuthorizationError();
  return ctx;
}

/** Require a role that holds the capability. Throws 401 or AuthorizationError (403). */
export async function requireCapability(capability: Capability): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!hasCapability(ctx.role, capability)) throw new AuthorizationError();
  return ctx;
}

/** Require access to an inventory type ("read": any role, "mutate": per role capability). Throws 401 or 403. */
export async function requireInventoryAccess(
  type: ItemType,
  mode: InventoryAccessMode = "mutate",
): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canAccessInventory(ctx.role, type, mode)) {
    throw new AuthorizationError(`Role ${ctx.role} cannot ${mode} ${type} inventory`);
  }
  return ctx;
}
