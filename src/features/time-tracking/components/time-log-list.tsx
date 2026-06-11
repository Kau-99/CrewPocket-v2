"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

import { useTimeLogMutations } from "../hooks/use-time-logs";
import type { TimeLog } from "../schemas";
import { formatHours, timeLogHours } from "../utils";

interface TimeLogListProps {
  logs: TimeLog[];
  /** Mostrar botão de excluir (job detail sim, /field não). */
  allowDelete?: boolean;
}

export function TimeLogList({ logs, allowDelete = false }: TimeLogListProps) {
  const dict = useTranslation();
  const { remove } = useTimeLogMutations();

  if (logs.length === 0) {
    return <p className="p-4 text-center text-sm text-muted-foreground">{dict.time.noLogs}</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {logs.map((log) => (
        <li key={log.id} className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{log.crewName || dict.time.owner}</p>
            <p className="text-xs text-muted-foreground">{log.clockIn.toDate().toLocaleString()}</p>
          </div>
          {log.clockOut ? (
            <span className="text-sm tabular-nums">{formatHours(timeLogHours(log))}</span>
          ) : (
            <Badge variant="secondary" className="border-0 bg-emerald-500/15 text-emerald-400">
              {dict.time.runningBadge}
            </Badge>
          )}
          {allowDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={dict.common.delete}
              onClick={() => {
                remove.mutate(log, {
                  onSuccess: () => toast(dict.time.deletedToast),
                  onError: () => toast.error(dict.errors.unknown),
                });
              }}
            >
              <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
