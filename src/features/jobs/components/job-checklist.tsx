"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { useJobMutations } from "../hooks/use-jobs";
import type { ChecklistItem, Job } from "../schemas";

/** Checklist interativo do job (toggle/add/remove persistem na hora). */
export function JobChecklist({ job }: { job: Job }) {
  const dict = useTranslation();
  const f = dict.jobs.fields;
  const { setChecklist } = useJobMutations();
  const [newTask, setNewTask] = useState("");

  function save(next: ChecklistItem[]) {
    setChecklist.mutate(
      { job, checklist: next },
      { onError: () => toast.error(dict.errors.unknown) },
    );
  }

  function toggle(id: string) {
    save(job.checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  function remove(id: string) {
    save(job.checklist.filter((item) => item.id !== id));
  }

  function add() {
    const text = newTask.trim();
    if (!text) return;
    save([...job.checklist, { id: crypto.randomUUID(), text, done: false }].slice(0, 50));
    setNewTask("");
  }

  const done = job.checklist.filter((item) => item.done).length;

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 flex items-center justify-between font-semibold">
        {f.checklist}
        {job.checklist.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            {done}/{job.checklist.length}
          </span>
        )}
      </h2>

      {job.checklist.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {job.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => {
                  toggle(item.id);
                }}
                className="size-4 shrink-0 accent-primary"
                aria-label={item.text}
              />
              <span
                className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => {
                  remove(item.id);
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label={dict.common.delete}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={newTask}
          placeholder={f.checklistPlaceholder}
          aria-label={f.checklistAdd}
          onChange={(event) => {
            setNewTask(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {f.checklistAdd}
        </Button>
      </div>
    </section>
  );
}
