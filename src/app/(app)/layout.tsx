"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BottomTabs } from "@/components/shared/bottom-tabs";
import { Header } from "@/components/shared/header";
import { Sidebar } from "@/components/shared/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingForm } from "@/features/settings/components/onboarding-form";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-6">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/**
 * Route guard do grupo autenticado: sem sessão → /login?returnTo=…;
 * sem settings doc (primeiro login) → onboarding (SPEC §11 Fase 1).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, user, pathname, router]);

  if (authLoading || !user || settingsLoading) return <ShellSkeleton />;
  if (!settings) return <OnboardingForm />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomTabs />
    </div>
  );
}
