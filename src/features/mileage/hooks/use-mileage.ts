"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";

import {
  createMileageLog,
  deleteMileageLog,
  fetchMileagePage,
  restoreMileageLog,
  updateMileageLog,
  type MileageFormValues,
  type MileagePage,
  type PageCursor,
} from "../api";
import type { MileageLog } from "../schemas";

const KEY = "mileageLogs";

export function useMileageLogs() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useInfiniteQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    initialPageParam: null as PageCursor | null,
    queryFn: ({ pageParam }): Promise<MileagePage> => {
      if (!uid) return Promise.resolve({ items: [], cursor: null });
      return fetchMileagePage(uid, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

export function useMileageMutations({ onDone }: { onDone?: () => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  };

  const create = useMutation({
    mutationFn: (values: MileageFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createMileageLog(user.uid, values);
    },
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: MileageLog; values: MileageFormValues }) =>
      updateMileageLog(current, values),
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const remove = useMutation({
    mutationFn: (log: MileageLog) => deleteMileageLog(log.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (log: MileageLog) => restoreMileageLog(log),
    onSuccess: invalidate,
  });

  return { create, update, remove, undoRemove };
}
