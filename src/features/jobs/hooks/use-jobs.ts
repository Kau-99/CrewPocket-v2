"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

import {
  applyJobForm,
  changeJobStatus,
  createJob,
  deleteJob,
  fetchJobsByClient,
  fetchJobsPage,
  restoreJob,
  subscribeToJob,
  updateJobCosts,
  type JobsPage,
  type PageCursor,
} from "../api";
import type { CostItem, Job, JobFormValues, JobStatus } from "../schemas";

const LIST_KEY = "jobs";

export function useJobs() {
  const { user } = useAuth();
  const uid = user?.uid;

  return useInfiniteQuery({
    queryKey: [LIST_KEY, uid],
    enabled: Boolean(uid),
    initialPageParam: null as PageCursor | null,
    queryFn: ({ pageParam }): Promise<JobsPage> => {
      if (!uid) return Promise.resolve({ items: [], cursor: null });
      return fetchJobsPage(uid, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

export function useJobsByClient(clientId: string) {
  const { user } = useAuth();
  const uid = user?.uid;

  return useQuery({
    queryKey: [LIST_KEY, "byClient", uid, clientId],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchJobsByClient(uid, clientId) : Promise.resolve([])),
  });
}

interface JobDetailState {
  job: Job | null;
  loading: boolean;
}

/** Tempo real via onSnapshot — funciona offline com o cache persistente. */
export function useJob(id: string): JobDetailState {
  const [state, setState] = useState<JobDetailState>({ job: null, loading: true });

  useEffect(() => {
    setState({ job: null, loading: true });
    return subscribeToJob(id, (job) => {
      setState({ job, loading: false });
    });
  }, [id]);

  return state;
}

export function useJobMutations({ onDone }: { onDone?: (job: Job) => void } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [LIST_KEY] });
  };

  const create = useMutation({
    mutationFn: (values: JobFormValues) => {
      if (!user) throw new Error("not authenticated");
      return createJob(user.uid, values);
    },
    onSuccess: (job) => {
      invalidate();
      onDone?.(job);
    },
  });

  const update = useMutation({
    mutationFn: ({ current, values }: { current: Job; values: JobFormValues }) =>
      applyJobForm(current, values),
    onSuccess: (job) => {
      invalidate();
      onDone?.(job);
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ job, to }: { job: Job; to: JobStatus }) => changeJobStatus(job, to),
    onSuccess: invalidate,
  });

  const setCosts = useMutation({
    mutationFn: ({ job, costs }: { job: Job; costs: CostItem[] }) => updateJobCosts(job, costs),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (job: Job) => deleteJob(job.id),
    onSuccess: invalidate,
  });

  const undoRemove = useMutation({
    mutationFn: (job: Job) => restoreJob(job),
    onSuccess: invalidate,
  });

  return { create, update, changeStatus, setCosts, remove, undoRemove };
}
