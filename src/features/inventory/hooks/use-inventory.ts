"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";

import {
  createInventoryItem,
  deleteInventoryItem,
  fetchInventory,
  restoreInventoryItem,
  updateInventoryItem,
  type InventoryFormValues,
} from "../api";
import type { InventoryItem } from "../schemas";

const KEY = "inventoryItems";

export function useInventory() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchInventory(uid) : Promise.resolve([])),
  });
}

export function useInventoryMutations({ onDone }: { onDone?: () => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  };

  const create = useMutation({
    mutationFn: (values: InventoryFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createInventoryItem(user.uid, values);
    },
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: InventoryItem; values: InventoryFormValues }) =>
      updateInventoryItem(current, values),
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const remove = useMutation({
    mutationFn: (item: InventoryItem) => deleteInventoryItem(item.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (item: InventoryItem) => restoreInventoryItem(item),
    onSuccess: invalidate,
  });

  return { create, update, remove, undoRemove };
}
