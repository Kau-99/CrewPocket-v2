import type { Metadata, Viewport } from "next";
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
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
};

// Tema controlado pelo next-themes (attribute="class", default dark — SPEC §8)
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
