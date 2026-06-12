import { WifiOff } from "lucide-react";

/**
 * Fallback de navegação offline (servido pelo SW quando a rede falha e a
 * página não está em cache). Conteúdo 100% server-rendered: precisa ser
 * legível mesmo sem hidratação (chunks podem não estar em cache).
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-sm text-balance text-muted-foreground">
        This page isn&apos;t available without a connection. Your field data is safe — anything you
        saved offline will sync automatically when you&apos;re back online.
      </p>
      <a
        href="/field"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Try again
      </a>
    </main>
  );
}
