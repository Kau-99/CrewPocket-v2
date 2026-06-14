"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, navItemsFor } from "@/components/shared/nav-items";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

/** Sidebar desktop (≥ md). No mobile a navegação é a bottom tab bar. */
export function Sidebar() {
  const dict = useTranslation();
  const pathname = usePathname();
  const { settings } = useSettings();
  const items = navItemsFor(settings?.trade ?? "insulation");

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          Crew<span className="text-primary">Pocket</span>
        </Link>
      </div>
      <nav aria-label={dict.nav.more} className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {dict.nav[item.key]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
