"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

import {
  captureGps,
  clockIn,
  clockOut,
  deleteTimeLog,
  subscribeToJobLogs,
  subscribeToOpenLogs,
  subscribeToRecentLogs,
  type ClockInInput,
} from "../api";
import type { TimeLog } from "./../schemas";

const KEY = "timeLogs";

export function useOpenLogs(): TimeLog[] {
  const { user } = useAuth();
  const uid = user?.uid;
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    if (!uid) {
      setLogs([]);
      return;
    }
    return subscribeToOpenLogs(uid, setLogs);
  }, [uid]);

  return logs;
}

export function useJobLogs(jobId: string): { logs: TimeLog[]; loading: boolean } {
  const { user } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState<{ logs: TimeLog[]; loading: boolean }>({
    logs: [],
    loading: true,
  });

  useEffect(() => {
    if (!uid) {
      setState({ logs: [], loading: false });
      return;
    }
    return subscribeToJobLogs(uid, jobId, (logs) => {
      setState({ logs, loading: false });
    });
  }, [uid, jobId]);

  return state;
}

export function useRecentLogs(): TimeLog[] {
  const { user } = useAuth();
  const uid = user?.uid;
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    if (!uid) {
      setLogs([]);
      return;
    }
    return subscribeToRecentLogs(uid, setLogs);
  }, [uid]);

  return logs;
}

export function useTimeLogMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  };

  const start = useMutation({
    mutationFn: async (input: Omit<ClockInInput, "gps">) => {
      if (!user) throw new Error("not authenticated");
      const gps = await captureGps();
      return clockIn(user.uid, { ...input, gps });
    },
    onSuccess: invalidate,
  });

  const stop = useMutation({
    mutationFn: (log: TimeLog) => clockOut(log),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (log: TimeLog) => deleteTimeLog(log.id),
    onSuccess: invalidate,
  });

  return { start, stop, remove };
}
