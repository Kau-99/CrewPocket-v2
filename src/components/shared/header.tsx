"use client";

import { signOut } from "firebase/auth";
import { CloudOff, LogOut, RefreshCw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/shared/notifications-bell";
import { useAuth } from "@/hooks/use-auth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { useTranslation } from "@/hooks/use-translation";
import { auth } from "@/lib/firebase/client";

export function Header() {
  const dict = useTranslation();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const hasPendingWrites = usePendingWrites();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <span className="text-lg font-bold tracking-tight md:hidden">
        Crew<span className="text-primary">Pocket</span>
      </span>

      {!isOnline && (
        <span
          role="status"
          className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-500"
        >
          <CloudOff className="size-3.5" aria-hidden="true" />
          {dict.common.offlineBadge}
        </span>
      )}
      {isOnline && hasPendingWrites && (
        <span
          role="status"
          className="flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-400"
        >
          <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
          {dict.common.syncingBadge}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={user?.email ?? "Account"}>
              <UserRound className="size-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="max-w-52 truncate font-normal text-muted-foreground">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void handleSignOut()}>
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              {dict.nav.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
