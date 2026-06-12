"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/settings/components/account-section";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useTranslation } from "@/hooks/use-translation";

export default function SettingsPage() {
  const dict = useTranslation();
  const { settings, loading } = useSettings();

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{dict.settings.title}</h1>
      {/* key força remount quando o doc muda de usuário */}
      <SettingsForm key={settings.companyName} settings={settings} />
      <AccountSection />
    </div>
  );
}
