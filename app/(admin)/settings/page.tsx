import type { Metadata } from "next";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageCapability } from "@/lib/auth/page";
import { getAppSettings } from "@/lib/settings/service";
import { SettingsForm } from "./settings-form";
import { SettingsNav } from "./settings-nav";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const actor = await requirePageCapability("manage_settings");
  if (!actor) return <Forbidden requirement="Pengaturan hanya dapat diubah oleh peran yang diberi izin." />;

  const settings = await getAppSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pengaturan" description="Aturan yang berlaku untuk seluruh sistem. Setiap perubahan tercatat di History Log." />
      <SettingsNav role={actor.role} current="/settings" />
      <SettingsForm settings={settings} />
    </div>
  );
}
