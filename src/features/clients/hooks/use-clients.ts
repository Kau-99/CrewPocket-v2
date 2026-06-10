"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

import {
  createClient,
  deleteClient,
  fetchClient,
  fetchClientsPage,
  restoreClient,
  setClientArchived,
  updateClient,
  type ClientsPage,
  type PageCursor,
} from "../api";
import type { Client, ClientFormValues } from "../schemas";

const LIST_KEY = "clients";

export function useClients() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useInfiniteQuery({
    queryKey: [LIST_KEY, uid],
    enabled: Boolean(uid),
    initialPageParam: null as PageCursor | null,
    queryFn: ({ pageParam }): Promise<ClientsPage> => {
      if (!uid) return Promise.resolve({ items: [], cursor: null });
      return fetchClientsPage(uid, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [LIST_KEY, "detail", id],
    queryFn: () => fetchClient(id),
  });
}

interface MutationCallbacks {
  onDone?: (client: Client) => void;
}

export function useClientMutations({ onDone }: MutationCallbacks = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [LIST_KEY] });
  };

  const create = useMutation({
    mutationFn: (values: ClientFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createClient(user.uid, values);
    },
    onSuccess: (client) => {
      invalidate();
      onDone?.(client);
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: Client; values: ClientFormValues }) =>
      updateClient(current, values),
    onSuccess: (client) => {
      invalidate();
      onDone?.(client);
    },
  });

  const archive = useMutation({
    mutationFn: ({ client, isArchived }: { client: Client; isArchived: boolean }) =>
      setClientArchived(client, isArchived),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (client: Client) => deleteClient(client.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (client: Client) => restoreClient(client),
    onSuccess: invalidate,
  });

  return { create, update, archive, remove, undoRemove };
}
