import type { ReactNode } from "react";

/**
 * Layout do grupo autenticado. Na Fase 1 ganha: route guard (useAuth),
 * sidebar desktop, bottom tab bar mobile, badge offline e providers
 * (TanStack Query, next-themes, Toaster).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
