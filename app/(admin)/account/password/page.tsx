import type { Metadata } from "next";
import { FlashToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageAuth } from "@/lib/auth/page";
import { getAppSettings } from "@/lib/settings/service";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Ubah kata sandi" };

export default async function ChangePasswordPage({ searchParams }: PageProps<"/account/password">) {
  await requirePageAuth();
  const [{ passwordMinLength }, { notice }] = await Promise.all([getAppSettings(), searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ubah kata sandi" description="Setelah diubah, Anda tetap masuk di perangkat ini. Perangkat lain harus masuk lagi dengan kata sandi baru." />
      {notice === "changed" && <FlashToast message="Kata sandi berhasil diubah." params={["notice"]} />}
      <PasswordForm minLength={passwordMinLength} />
    </div>
  );
}
