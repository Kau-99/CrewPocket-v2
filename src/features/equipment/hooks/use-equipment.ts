"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";

import {
  createEquipmentItem,
  deleteEquipmentItem,
  fetchEquipment,
  restoreEquipmentItem,
  updateEquipmentItem,
  type EquipmentFormValues,
} from "../api";
import type { EquipmentItem } from "../schemas";

const KEY = "equipmentItems";

export function useEquipment() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchEquipment(uid) : Promise.resolve([])),
  });
}

export function useEquipmentMutations({ onDone }: { onDone?: () => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  };

  const create = useMutation({
    mutationFn: (values: EquipmentFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createEquipmentItem(user.uid, values);
    },
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: EquipmentItem; values: EquipmentFormValues }) =>
      updateEquipmentItem(current, values),
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const remove = useMutation({
    mutationFn: (item: EquipmentItem) => deleteEquipmentItem(item.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (item: EquipmentItem) => restoreEquipmentItem(item),
    onSuccess: invalidate,
  });

  return { create, update, remove, undoRemove };
}
