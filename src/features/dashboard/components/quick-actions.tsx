"use client";

import { Briefcase, FilePlus2, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

/** Quick actions (SPEC §8): New Job, New Estimate, Clock In. */
export function QuickActions() {
  const dict = useTranslation();

  const actions = [
    { href: "/jobs", label: dict.dashboard.newJob, icon: Briefcase },
    { href: "/estimates", label: dict.dashboard.newEstimate, icon: FilePlus2 },
    { href: "/field", label: dict.dashboard.clockIn, icon: Play },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.href} variant="outline" size="sm" asChild>
          <Link href={action.href}>
            <action.icon className="mr-1 size-4" aria-hidden="true" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
