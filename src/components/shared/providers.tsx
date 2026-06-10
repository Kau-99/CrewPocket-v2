"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";

export function Providers({ children }: { children: ReactNode }) {
  // useState garante 1 QueryClient por montagem (não compartilhado entre requests)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Offline-first (SPEC §7): cache responde primeiro, rede depois
          queries: { networkMode: "offlineFirst", staleTime: 30_000 },
          mutations: { networkMode: "offlineFirst" },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <AuthProvider>
          {children}
          <Toaster position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
