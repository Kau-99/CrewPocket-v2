"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BottomTabs } from "@/components/shared/bottom-tabs";
import { CommandPalette } from "@/components/shared/command-palette";
import { Header } from "@/components/shared/header";
import { InstallPrompt } from "@/components/shared/install-prompt";
import { Sidebar } from "@/components/shared/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Paywall } from "@/features/billing/components/paywall";
import { OnboardingForm } from "@/features/settings/components/onboarding-form";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

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
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, user, pathname, router]);

  if (authLoading || !user || settingsLoading || subscriptionLoading) return <ShellSkeleton />;
  if (!settings) return <OnboardingForm />;

  // Paywall global (SPEC §6.2): sem active/trialing, o app inteiro é o paywall
  const subscriptionActive =
    subscription?.status === "active" || subscription?.status === "trialing";
  if (!subscriptionActive) return <Paywall />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomTabs />
      <CommandPalette />
      <InstallPrompt />
    </div>
  );
}
