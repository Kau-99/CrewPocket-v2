"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { centsToDollarsString, dollarsToCents } from "@/lib/utils";
import type { Dictionary } from "@/i18n";

import { useJobMutations } from "../hooks/use-jobs";
import { prioritySchema, type Job, type JobFormValues } from "../schemas";

export interface ClientOption {
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
}

const NO_CLIENT = "none";

function buildFormSchema(dict: Dictionary) {
  const money = z
    .string()
    .refine((value) => dollarsToCents(value) !== null, dict.errors.validation);
  return z.object({
    name: z.string().trim().min(1, dict.forms.required).max(200),
    clientId: z.string(),
    priority: prioritySchema,
    date: z.string().min(1, dict.forms.required),
    deadline: z.string(),
    address: z.string().max(300),
    zip: z.string().max(10),
    description: z.string().max(2000),
    notes: z.string().max(2000),
    tagsText: z.string(),
    value: money,
    deposit: money,
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

function toFormValues(job: Job | undefined): FormValues {
  return {
    name: job?.name ?? "",
    clientId: job?.clientId ?? NO_CLIENT,
    priority: job?.priority ?? "normal",
    date: job ? job.date.toDate().toISOString().slice(0, 10) : "",
    deadline: job?.deadline ? job.deadline.toDate().toISOString().slice(0, 10) : "",
    address: job?.address ?? "",
    zip: job?.zip ?? "",
    description: job?.description ?? "",
    notes: job?.notes ?? "",
    tagsText: job?.tags.join(", ") ?? "",
    value: job ? centsToDollarsString(job.valueCents) : "0.00",
    deposit: job ? centsToDollarsString(job.depositCents) : "0.00",
  };
}

export function JobFormDialog({ open, onOpenChange, job, clientOptions }: JobFormDialogProps) {
  const dict = useTranslation();
  const fields = dict.jobs.fields;
  const schema = useMemo(() => buildFormSchema(dict), [dict]);
  const { create, update } = useJobMutations({
    onDone: () => {
      onOpenChange(false);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(undefined),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(job));
  }, [open, job, form]);

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
    };
    const mutation = job
      ? update.mutateAsync({ current: job, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{job ? dict.jobs.edit : dict.jobs.new}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
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
            <div className="flex justify-end gap-2">
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
