"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, MORE_ITEMS, TAB_ITEMS } from "@/components/shared/nav-items";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/use-translation";
import { useUiStore } from "@/hooks/use-ui-store";
import { cn } from "@/lib/utils";

const tabClass = (active: boolean) =>
  cn(
    "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
    active ? "text-primary" : "text-muted-foreground",
  );

/** Bottom tab bar mobile: Dashboard, Jobs, Field, More (SPEC §8). */
export function BottomTabs() {
  const dict = useTranslation();
  const pathname = usePathname();
  const open = useUiStore((store) => store.mobileNavOpen);
  const setOpen = useUiStore((store) => store.setMobileNavOpen);

  return (
    <nav
      aria-label={dict.nav.more}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TAB_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={tabClass(active)}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {dict.nav[item.key]}
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className={tabClass(false)} aria-label={dict.nav.more}>
          <MoreHorizontal className="size-5" aria-hidden="true" />
          {dict.nav.more}
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{dict.nav.more}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 py-4">
            {MORE_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border p-2 text-center text-xs font-medium",
                    active ? "border-primary text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                  {dict.nav[item.key]}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
