import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import "@/env";
import "@/styles/globals.css";

import { Providers } from "@/components/shared/providers";

// CSP com nonce (§6.5) exige render por request: páginas estáticas serviriam
// HTML pré-construído com scripts sem nonce e o browser bloquearia a hidratação
// inteira em produção (ADR-029).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "CrewPocket",
    template: "%s · CrewPocket",
  },
  description:
    "Field service management for small contractors — estimates, jobs, time tracking and invoices.",
  applicationName: "CrewPocket",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  // PWA instalável no iOS (Safari não tem prompt; usa Add to Home Screen)
  appleWebApp: {
    capable: true,
    title: "CrewPocket",
    statusBarStyle: "black-translucent",
  },
  // não transformar números em links de telefone (atrapalha valores/ZIP)
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  // ocupa a tela inteira atrás do notch no iOS standalone
  viewportFit: "cover",
};

// Tema controlado pelo next-themes (attribute="class", default dark — SPEC §8)
export default function RootLayout({ children }: { children: ReactNode }) {
  // O script anti-flash do next-themes é inline: sem o nonce da request a CSP
  // o bloqueia (ADR-029). Header injetado pelo middleware; ausente em dev.
  const nonce = headers().get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
