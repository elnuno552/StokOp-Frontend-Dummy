import type { Metadata } from "next";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageCapability } from "@/lib/auth/page";
import { getAppSettings } from "@/lib/settings/service";
import { SettingsNav } from "../settings-nav";
import { SecurityForm } from "./security-form";

export const metadata: Metadata = { title: "Keamanan" };

export default async function SecuritySettingsPage() {
  const actor = await requirePageCapability("manage_settings");
  if (!actor) return <Forbidden requirement="Pengaturan hanya dapat diubah oleh peran yang diberi izin." />;

  const { maxFailedAttempts, lockMinutes, passwordMinLength } = await getAppSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pengaturan" description="Batas percobaan masuk dan panjang minimal kata sandi. Angkanya dapat disesuaikan kapan saja." />
      <SettingsNav role={actor.role} current="/settings/security" />
      <SecurityForm settings={{ maxFailedAttempts, lockMinutes, passwordMinLength }} />
    </div>
  );
}
