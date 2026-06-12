"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { isAppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

import { useOpenLogs, useTimeLogMutations } from "../hooks/use-time-logs";
import { formatElapsed } from "../utils";

export interface Option {
  id: string;
  name: string;
}

interface FieldClockProps {
  jobOptions: Option[];
  memberOptions: Option[];
  jobId: string;
  onJobChange: (jobId: string) => void;
  /** null = o próprio dono */
  memberId: string | null;
  onMemberChange: (memberId: string | null) => void;
}

const OWNER = "owner";

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [active]);
  return now;
}

/** Botão gigante (≥64px) — persona usa luvas no sol (SPEC §1/§8). */
export function FieldClock(props: FieldClockProps) {
  const { jobOptions, memberOptions, jobId, onJobChange, memberId, onMemberChange } = props;
  const dict = useTranslation();
  const openLogs = useOpenLogs();
  const { start, stop } = useTimeLogMutations();

  const activeLog = openLogs.find((log) => log.crewMemberId === memberId);
  const now = useNow(Boolean(activeLog));
  const memberName =
    memberId === null
      ? dict.time.owner
      : (memberOptions.find((option) => option.id === memberId)?.name ?? "");

  function handleClock() {
    if (activeLog) {
      stop.mutate(activeLog, {
        onSuccess: () => toast.success(dict.time.clockedOutToast),
        onError: () => toast.error(dict.errors.unknown),
      });
      return;
    }
    if (!jobId) {
      toast.error(dict.time.selectJobFirst);
      return;
    }
    start.mutate(
      { jobId, crewMemberId: memberId, crewName: memberName, openLogs },
      {
        onSuccess: () => toast.success(dict.time.clockedInToast),
        onError: (error) =>
          toast.error(
            isAppError(error) && error.code === "validation"
              ? dict.time.alreadyRunning
              : dict.errors.unknown,
          ),
      },
    );
  }

  const pending = start.isPending || stop.isPending;
  // sem job selecionado não há o que registrar (e o select ainda pode estar carregando)
  const clockDisabled = pending || (!activeLog && jobId === "");

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select value={jobId} onValueChange={onJobChange}>
          <SelectTrigger className="min-h-12" aria-label={dict.time.selectJob}>
            <SelectValue placeholder={dict.time.selectJob} />
          </SelectTrigger>
          <SelectContent>
            {jobOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={memberId ?? OWNER}
          onValueChange={(value) => {
            onMemberChange(value === OWNER ? null : value);
          }}
        >
          <SelectTrigger className="min-h-12" aria-label={dict.time.member}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OWNER}>{dict.time.owner}</SelectItem>
            {memberOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {activeLog ? dict.time.activeTimer : dict.time.noActiveTimer}
        </p>
        <p className="font-mono text-5xl font-bold tabular-nums" role="timer">
          {activeLog ? formatElapsed(now - activeLog.clockIn.toMillis()) : "0:00:00"}
        </p>
      </div>

      <Button
        size="lg"
        disabled={clockDisabled}
        onClick={handleClock}
        className={cn(
          "h-20 w-full text-xl font-bold",
          activeLog && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        )}
      >
        {activeLog ? (
          <Pause className="mr-2 size-6" aria-hidden="true" />
        ) : (
          <Play className="mr-2 size-6" aria-hidden="true" />
        )}
        {activeLog ? dict.time.clockOut : dict.time.clockIn}
      </Button>
    </section>
  );
}
