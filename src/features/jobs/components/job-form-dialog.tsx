"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { cn, centsToDollarsString, dollarsToCents } from "@/lib/utils";
import type { Dictionary } from "@/i18n";

import { useJobMutations } from "../hooks/use-jobs";
import { prioritySchema, type ChecklistItem, type Job, type JobFormValues } from "../schemas";

export interface ClientOption {
  id: string;
  name: string;
}

export interface CrewOption {
  id: string;
  name: string;
}

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = criar; preenchido = editar */
  job?: Job | undefined;
  /** Clientes para o select — injetados pela página (features são ilhas). */
  clientOptions: ClientOption[];
  /** Equipe para atribuição — injetada pela página. */
  crewOptions?: CrewOption[];
}

const NO_CLIENT = "none";

function buildFormSchema(dict: Dictionary) {
  const money = z
    .string()
    .refine((value) => dollarsToCents(value) !== null, dict.errors.validation);
  const number = z
    .string()
    .refine((value) => value === "" || Number.isFinite(Number(value)), dict.errors.validation);
  return z.object({
    name: z.string().trim().min(1, dict.forms.required).max(200),
    serviceType: z.string().max(80),
    clientId: z.string(),
    priority: prioritySchema,
    date: z.string().min(1, dict.forms.required),
    scheduledTime: z.string().max(60),
    deadline: z.string(),
    address: z.string().max(300),
    city: z.string().max(120),
    state: z.string().max(40),
    zip: z.string().max(10),
    areaSqft: number,
    value: money,
    deposit: money,
    siteContactName: z.string().max(120),
    siteContactPhone: z.string().max(40),
    referralSource: z.string().max(120),
    tagsText: z.string(),
    description: z.string().max(2000),
    notes: z.string().max(2000),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

function toFormValues(job: Job | undefined): FormValues {
  return {
    name: job?.name ?? "",
    serviceType: job?.serviceType ?? "",
    clientId: job?.clientId ?? NO_CLIENT,
    priority: job?.priority ?? "normal",
    date: job ? job.date.toDate().toISOString().slice(0, 10) : "",
    scheduledTime: job?.scheduledTime ?? "",
    deadline: job?.deadline ? job.deadline.toDate().toISOString().slice(0, 10) : "",
    address: job?.address ?? "",
    city: job?.city ?? "",
    state: job?.state ?? "",
    zip: job?.zip ?? "",
    areaSqft: job?.areaSqft ? String(job.areaSqft) : "",
    value: job ? centsToDollarsString(job.valueCents) : "0.00",
    deposit: job ? centsToDollarsString(job.depositCents) : "0.00",
    siteContactName: job?.siteContactName ?? "",
    siteContactPhone: job?.siteContactPhone ?? "",
    referralSource: job?.referralSource ?? "",
    tagsText: job?.tags.join(", ") ?? "",
    description: job?.description ?? "",
    notes: job?.notes ?? "",
  };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export function JobFormDialog({
  open,
  onOpenChange,
  job,
  clientOptions,
  crewOptions = [],
}: JobFormDialogProps) {
  const dict = useTranslation();
  const fields = dict.jobs.fields;
  const sections = dict.jobs.sections;
  const schema = useMemo(() => buildFormSchema(dict), [dict]);
  const { create, update } = useJobMutations({
    onDone: () => {
      onOpenChange(false);
    },
  });

  // arrays gerenciados fora do RHF (UI dedicada)
  const [crewIds, setCrewIds] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newTask, setNewTask] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(undefined),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toFormValues(job));
    setCrewIds(job?.crewIds ?? []);
    setChecklist(job?.checklist ?? []);
    setNewTask("");
  }, [open, job, form]);

  function toggleCrew(id: string) {
    setCrewIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewTask("");
  }

  function onSubmit(raw: FormValues) {
    const clientName =
      raw.clientId === NO_CLIENT
        ? ""
        : (clientOptions.find((option) => option.id === raw.clientId)?.name ?? "");
    const values: JobFormValues = {
      name: raw.name,
      clientId: raw.clientId === NO_CLIENT ? null : raw.clientId,
      clientName,
      priority: raw.priority,
      date: new Date(`${raw.date}T12:00:00`),
      deadline: raw.deadline ? new Date(`${raw.deadline}T12:00:00`) : null,
      address: raw.address,
      zip: raw.zip,
      description: raw.description,
      notes: raw.notes,
      tags: raw.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      valueCents: dollarsToCents(raw.value) ?? 0,
      depositCents: dollarsToCents(raw.deposit) ?? 0,
      serviceType: raw.serviceType.trim(),
      city: raw.city.trim(),
      state: raw.state.trim(),
      areaSqft: raw.areaSqft === "" ? 0 : Math.max(0, Number(raw.areaSqft)),
      scheduledTime: raw.scheduledTime.trim(),
      siteContactName: raw.siteContactName.trim(),
      siteContactPhone: raw.siteContactPhone.trim(),
      referralSource: raw.referralSource.trim(),
      crewIds: crewIds.slice(0, 20),
      checklist: checklist.slice(0, 50),
    };
    const mutation = job
      ? update.mutateAsync({ current: job, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{job ? dict.jobs.edit : dict.jobs.new}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
            {/* ── Basics ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.basics}</SectionTitle>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.name}</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.serviceType}</FormLabel>
                      <FormControl>
                        <Input placeholder={fields.serviceTypePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.priority}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {prioritySchema.options.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {dict.jobs.priorities[priority]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.client}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CLIENT}>{fields.noClient}</SelectItem>
                        {clientOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* ── Schedule ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.schedule}</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.date}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.scheduledTime}</FormLabel>
                      <FormControl>
                        <Input placeholder={fields.scheduledTimePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.deadline}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* ── Location ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.location}</SectionTitle>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.address}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{fields.city}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.state}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.zip}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="areaSqft"
                render={({ field }) => (
                  <FormItem className="sm:max-w-[12rem]">
                    <FormLabel>{fields.areaSqft}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* ── Money ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.money}</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.value} ($)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.deposit} ($)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* ── Site contact ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.contact}</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="siteContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.siteContactName}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="siteContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.siteContactPhone}</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referralSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{fields.referralSource}</FormLabel>
                      <FormControl>
                        <Input placeholder={fields.referralPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* ── Crew & checklist ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.crew}</SectionTitle>
              <div className="space-y-1.5">
                <Label>{fields.crew}</Label>
                {crewOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{fields.crewEmpty}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {crewOptions.map((member) => {
                      const selected = crewIds.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            toggleCrew(member.id);
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:bg-accent",
                          )}
                          aria-pressed={selected}
                        >
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{fields.checklist}</Label>
                {checklist.length > 0 && (
                  <ul className="space-y-1.5">
                    {checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => {
                            setChecklist((prev) =>
                              prev.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)),
                            );
                          }}
                          className="size-4 shrink-0 accent-primary"
                          aria-label={item.text}
                        />
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            item.done && "text-muted-foreground line-through",
                          )}
                        >
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setChecklist((prev) => prev.filter((x) => x.id !== item.id));
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
                    placeholder={fields.checklistPlaceholder}
                    onChange={(event) => {
                      setNewTask(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTask();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTask}>
                    <Plus className="mr-1 size-4" aria-hidden="true" />
                    {fields.checklistAdd}
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Notes & tags ── */}
            <section className="space-y-3">
              <SectionTitle>{sections.moreInfo}</SectionTitle>
              <FormField
                control={form.control}
                name="tagsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.tags}</FormLabel>
                    <FormControl>
                      <Input placeholder={fields.tagsPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.description}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.notes}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {dict.common.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? dict.common.loading : dict.common.save}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
