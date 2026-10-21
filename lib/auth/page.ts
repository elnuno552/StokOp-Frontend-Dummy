import "server-only";
import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/errors";
import { requireAuth, requireCapability, requireRole, type AuthContext } from "@/lib/auth/guards";
import type { Capability, RoleName } from "@/lib/permissions";

// Page-level wrappers around the guards. Pages must call these themselves:
// layouts do not re-run on client navigation, so a layout check alone is not
// an authorization boundary.

/** Signed-in user, or redirect to /login. */
export async function requirePageAuth(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
}

/** User whose role holds the capability, `null` when signed in but not allowed (render <Forbidden />), or redirect to /login. */
export async function requirePageCapability(capability: Capability): Promise<AuthContext | null> {
  try {
    return await requireCapability(capability);
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) return null;
    throw error;
  }
}

/** User with one of the roles, `null` when signed in but not allowed (render <Forbidden />), or redirect to /login. */
export async function requirePageRole(...roles: RoleName[]): Promise<AuthContext | null> {
  try {
    return await requireRole(...roles);
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) return null;
    throw error;
  }
}
