import { Boxes } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import { panel } from "@/components/ui/styles";
import { DEMO_USERS, auth, signIn } from "@/lib/auth";
import { roleLabel } from "@/lib/permissions";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    await signIn(String(formData.get("userId") ?? ""), "/");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-accent text-on-accent">
            <Boxes aria-hidden className="size-5" />
          </span>
          <p className="text-sm font-semibold text-fg">Sistem Inventory</p>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-fg">Masuk</h1>
        <p className="mt-1 text-sm text-muted">Versi demo antarmuka dengan data contoh. Pilih peran untuk melihat tampilan masing-masing.</p>

        <div className={`${panel} mt-6 flex flex-col gap-3 p-5 sm:p-6`}>
          {error && <Notice tone="error">Akun demo tidak ditemukan.</Notice>}
          {DEMO_USERS.map((user) => (
            <form key={user.id} action={login}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="flex min-h-11 w-full flex-col items-start rounded-md border border-border-strong px-3 py-2 text-left hover:bg-surface-sunken"
              >
                <span className="text-sm font-semibold text-fg">{roleLabel(user.role)}</span>
                <span className="text-xs text-muted">
                  {user.name} · <span className="font-mono">{user.username}</span>
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
