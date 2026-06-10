"use client";

import { MoreHorizontal, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/hooks/use-translation";

import { useClientMutations, useClients } from "../hooks/use-clients";
import type { Client } from "../schemas";
import { ClientFormDialog } from "./client-form-dialog";

export function ClientsList() {
  const dict = useTranslation();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | undefined>(undefined);
  const [deleting, setDeleting] = useState<Client | undefined>(undefined);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useClients();
  const { archive, remove, undoRemove } = useClientMutations();

  const allClients = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return allClients
      .filter((client) => showArchived || !client.isArchived)
      .filter(
        (client) =>
          term === "" ||
          client.name.toLowerCase().includes(term) ||
          client.email.toLowerCase().includes(term) ||
          client.phone.toLowerCase().includes(term),
      );
  }, [allClients, debouncedSearch, showArchived]);

  function handleArchive(client: Client, isArchived: boolean) {
    archive.mutate(
      { client, isArchived },
      {
        onSuccess: () => {
          toast(isArchived ? dict.clients.archivedToast : dict.clients.restoredToast, {
            action: {
              label: dict.common.undo,
              onClick: () => {
                archive.mutate({ client, isArchived: !isArchived });
              },
            },
          });
        },
        onError: () => toast.error(dict.errors.unknown),
      },
    );
  }

  function handleDelete(client: Client) {
    remove.mutate(client, {
      onSuccess: () => {
        toast(dict.clients.deletedToast, {
          duration: 5000,
          action: {
            label: dict.common.undo,
            onClick: () => {
              undoRemove.mutate(client);
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
        <h1 className="text-2xl font-semibold">{dict.clients.title}</h1>
        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {dict.clients.new}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder={dict.clients.search}
          className="max-w-xs"
          aria-label={dict.clients.search}
        />
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => {
              setShowArchived(event.target.checked);
            }}
            className="size-4 accent-primary"
          />
          {dict.clients.showArchived}
        </Label>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : allClients.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <UserRound className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{dict.clients.empty}</p>
          <p className="text-sm text-muted-foreground">{dict.clients.emptyCta}</p>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            {dict.clients.new}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{dict.common.noResults}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((client) => (
            <li key={client.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                  {client.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {[client.email, client.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              {client.isArchived && <Badge variant="secondary">{dict.clients.archivedBadge}</Badge>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={dict.common.edit}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditing(client);
                      setFormOpen(true);
                    }}
                  >
                    {dict.common.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      handleArchive(client, !client.isArchived);
                    }}
                  >
                    {client.isArchived ? dict.clients.unarchive : dict.clients.archive}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      setDeleting(client);
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

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? dict.common.loading : dict.common.loadMore}
          </Button>
        </div>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.clients.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.clients.deleteDescription}</AlertDialogDescription>
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
