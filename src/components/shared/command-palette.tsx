"use client";

import { Briefcase, FilePlus2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/components/shared/nav-items";
import { useTranslation } from "@/hooks/use-translation";

/** ⌘K: buscar/navegar/criar (SPEC §8, ADR-012). */
export function CommandPalette() {
  const dict = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const actions = [
    { label: dict.palette.newJob, href: "/jobs", icon: Briefcase },
    { label: dict.palette.newEstimate, href: "/estimates", icon: FilePlus2 },
    { label: dict.palette.newClient, href: "/clients", icon: UserPlus },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={dict.palette.placeholder} />
      <CommandList>
        <CommandEmpty>{dict.palette.emptyResults}</CommandEmpty>
        <CommandGroup heading={dict.palette.actions}>
          {actions.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => {
                go(action.href);
              }}
            >
              <action.icon className="mr-2 size-4" aria-hidden="true" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={dict.palette.navigation}>
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => {
                go(item.href);
              }}
            >
              <item.icon className="mr-2 size-4" aria-hidden="true" />
              {dict.nav[item.key]}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
