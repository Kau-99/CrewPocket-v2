"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";

import {
  createPricebookItem,
  deletePricebookItem,
  fetchPricebook,
  restorePricebookItem,
  updatePricebookItem,
  type PricebookFormValues,
} from "../api";
import type { PricebookItem } from "../schemas";

const KEY = "pricebookItems";

export function usePricebook() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchPricebook(uid) : Promise.resolve([])),
  });
}

export function usePricebookMutations({ onDone }: { onDone?: () => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  };

  const create = useMutation({
    mutationFn: (values: PricebookFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createPricebookItem(user.uid, values);
    },
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: PricebookItem; values: PricebookFormValues }) =>
      updatePricebookItem(current, values),
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const remove = useMutation({
    mutationFn: (item: PricebookItem) => deletePricebookItem(item.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (item: PricebookItem) => restorePricebookItem(item),
    onSuccess: invalidate,
  });

  return { create, update, remove, undoRemove };
}
