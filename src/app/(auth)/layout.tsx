"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

/** Usuário já autenticado não vê telas de auth — vai direto ao app. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Skeleton className="h-80 w-full max-w-sm" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Crew<span className="text-primary">Pocket</span>
      </h1>
      {children}
    </main>
  );
}
