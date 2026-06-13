"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

import {
  convertEstimateToJob,
  createEstimate,
  createTemplate,
  deleteEstimate,
  deleteTemplate,
  fetchAllEstimates,
  fetchEstimatesPage,
  fetchTemplates,
  markEstimateAccepted,
  markEstimateDeclined,
  markEstimateSent,
  restoreEstimate,
  subscribeToEstimate,
  updateEstimate,
  type EstimatesPage,
  type NewEstimateInput,
  type NewTemplateInput,
  type PageCursor,
} from "../api";
import type { Estimate } from "../schemas";

const KEY = "estimates";
const TEMPLATES_KEY = "estimateTemplates";

export function useEstimateTemplates() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [TEMPLATES_KEY, uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchTemplates(uid) : Promise.resolve([])),
  });
}

export function useTemplateMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
  };

  const create = useMutation({
    mutationFn: (input: NewTemplateInput) => {
      if (!user) throw new Error("not authenticated");
      return createTemplate(user.uid, input);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: invalidate,
  });

  return { create, remove };
}

export function useEstimates() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useInfiniteQuery({
    queryKey: [KEY, uid],
    enabled: Boolean(uid),
    initialPageParam: null as PageCursor | null,
    queryFn: ({ pageParam }): Promise<EstimatesPage> => {
      if (!uid) return Promise.resolve({ items: [], cursor: null });
      return fetchEstimatesPage(uid, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

/** Notificações/analytics — todos os estimates do dono. */
export function useAllEstimates() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [KEY, "all", uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchAllEstimates(uid) : Promise.resolve([])),
  });
}

export function useEstimate(id: string): { estimate: Estimate | null; loading: boolean } {
  const [state, setState] = useState<{ estimate: Estimate | null; loading: boolean }>({
    estimate: null,
    loading: true,
  });

  useEffect(() => {
    setState({ estimate: null, loading: true });
    return subscribeToEstimate(id, (estimate) => {
      setState({ estimate, loading: false });
    });
  }, [id]);

  return state;
}

export function useEstimateMutations({ onCreated }: { onCreated?: (e: Estimate) => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const create = useMutation({
    mutationFn: (input: NewEstimateInput) => {
      if (!user) throw new Error("not authenticated");
      return createEstimate(user.uid, input);
    },
    onSuccess: (estimate) => {
      invalidate();
      onCreated?.(estimate);
    },
  });

  const update = useMutation({
    mutationFn: ({
      current,
      values,
    }: {
      current: Estimate;
      values: Parameters<typeof updateEstimate>[1];
    }) => updateEstimate(current, values),
    onSuccess: invalidate,
  });

  const send = useMutation({ mutationFn: markEstimateSent, onSuccess: invalidate });
  const accept = useMutation({ mutationFn: markEstimateAccepted, onSuccess: invalidate });
  const decline = useMutation({ mutationFn: markEstimateDeclined, onSuccess: invalidate });

  const convert = useMutation({
    mutationFn: (estimate: Estimate) => {
      if (!user) throw new Error("not authenticated");
      return convertEstimateToJob(user.uid, estimate);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (estimate: Estimate) => deleteEstimate(estimate.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (estimate: Estimate) => restoreEstimate(estimate),
    onSuccess: invalidate,
  });

  return { create, update, send, accept, decline, convert, remove, undoRemove };
}
