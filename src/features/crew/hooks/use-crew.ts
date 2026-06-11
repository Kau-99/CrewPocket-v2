"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";

import {
  createCrewMember,
  deleteCrewMember,
  fetchCrew,
  restoreCrewMember,
  updateCrewMember,
  type CrewFormValues,
} from "../api";
import type { CrewMember } from "../schemas";

const KEY = "crewMembers";

export function useCrewMembers() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchCrew(uid) : Promise.resolve([])),
  });
}

export function useCrewMutations({ onDone }: { onDone?: () => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  };

  const create = useMutation({
    mutationFn: (values: CrewFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createCrewMember(user.uid, values);
    },
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: CrewMember; values: CrewFormValues }) =>
      updateCrewMember(current, values),
    onSuccess: () => {
      invalidate();
      onDone?.();
    },
  });

  const remove = useMutation({
    mutationFn: (member: CrewMember) => deleteCrewMember(member.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (member: CrewMember) => restoreCrewMember(member),
    onSuccess: invalidate,
  });

  return { create, update, remove, undoRemove };
}
