"use client";

import { MoreHorizontal, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import { formatCents } from "@/lib/utils";

import { useCrewMembers, useCrewMutations } from "../hooks/use-crew";
import type { CrewMember } from "../schemas";
import { CrewFormDialog } from "./crew-form-dialog";

export function CrewList() {
  const dict = useTranslation();
  const { data: members, isLoading } = useCrewMembers();
  const { remove, undoRemove } = useCrewMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrewMember | undefined>(undefined);
  const [deleting, setDeleting] = useState<CrewMember | undefined>(undefined);

  function handleDelete(member: CrewMember) {
    remove.mutate(member, {
      onSuccess: () => {
        toast(dict.crew.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(member);
            },
          },
        });
      },
      onError: () => toast.error(dict.errors.unknown),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{dict.crew.title}</h1>
        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {dict.crew.new}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <UsersRound className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.crew.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.crew.emptyCta}</p>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            {dict.crew.new}
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[member.role, formatCents(member.hourlyRateCents) + "/h"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Badge variant="secondary">{dict.crew.statuses[member.status]}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={dict.common.edit}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditing(member);
                      setFormOpen(true);
                    }}
                  >
                    {dict.common.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      setDeleting(member);
                    }}
                  >
                    {dict.common.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <CrewFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.crew.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.crew.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) handleDelete(deleting);
                setDeleting(undefined);
              }}
            >
              {dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
