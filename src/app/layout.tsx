import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/env";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "CrewPocket",
    template: "%s · CrewPocket",
  },
  description:
    "Field service management for small contractors — estimates, jobs, time tracking and invoices.",
  applicationName: "CrewPocket",
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
};

// Dark é o default do produto; next-themes assume o controle na Fase 1.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
