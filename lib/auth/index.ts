import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RoleName } from "@/lib/permissions";

// Demo build: no database and no passwords. The "session" is a cookie holding the id of one of the
// fixed demo accounts below, chosen on the login page.

export const DEMO_COOKIE = "demo_user";

export interface DemoUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: RoleName;
}

export const DEMO_USERS: readonly DemoUser[] = [
  { id: "u-hyper", name: "Rina Kusumawati", username: "hyperadmin", email: "hyperadmin@demo.local", role: "HYPER_ADMIN" },
  { id: "u-super", name: "Budi Santoso", username: "superadmin", email: "superadmin@demo.local", role: "SUPER_ADMIN" },
  { id: "u-bmn", name: "Dewi Lestari", username: "adminbmn", email: "adminbmn@demo.local", role: "ADMIN_BMN" },
  { id: "u-atk", name: "Agus Prasetyo", username: "adminatk", email: "adminatk@demo.local", role: "ADMIN_ATK" },
  { id: "u-staff", name: "Siti Nurhaliza", username: "staf", email: "staf@demo.local", role: "STAFF" },
];

export function findDemoUser(id: string | undefined): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}

export async function auth(): Promise<{ user: DemoUser } | null> {
  const user = findDemoUser((await cookies()).get(DEMO_COOKIE)?.value);
  return user ? { user } : null;
}

export async function signIn(userId: string, redirectTo = "/") {
  if (!findDemoUser(userId)) redirect("/login?error=invalid");
  (await cookies()).set(DEMO_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(redirectTo);
}

export async function signOut({ redirectTo = "/login" }: { redirectTo?: string } = {}) {
  (await cookies()).delete(DEMO_COOKIE);
  redirect(redirectTo);
}
