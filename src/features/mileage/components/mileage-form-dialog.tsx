"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
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
import type { Dictionary } from "@/i18n";
import { useTranslation } from "@/hooks/use-translation";

import { useMileageMutations } from "../hooks/use-mileage";
import type { MileageLog } from "../schemas";

export interface JobOption {
  id: string;
  name: string;
}

interface MileageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log?: MileageLog | undefined;
  jobOptions: JobOption[];
}

const NO_JOB = "none";

function buildSchema(dict: Dictionary) {
  return z.object({
    date: z.string().min(1, dict.forms.required),
    miles: z.string().refine((value) => {
      const miles = Number(value);
      return Number.isFinite(miles) && miles >= 0 && miles <= 1000;
    }, dict.errors.validation),
    purpose: z.string().max(200),
    jobId: z.string(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(log: MileageLog | undefined): FormValues {
  return {
    date: log
      ? log.date.toDate().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    miles: log ? String(log.miles) : "",
    purpose: log?.purpose ?? "",
    jobId: log?.jobId ?? NO_JOB,
  };
}

export function MileageFormDialog({ open, onOpenChange, log, jobOptions }: MileageFormDialogProps) {
  const dict = useTranslation();
  const fields = dict.mileage.fields;
  const schema = useMemo(() => buildSchema(dict), [dict]);
  const { create, update } = useMileageMutations({
    onDone: () => {
      onOpenChange(false);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(undefined),
  });

  // inicializa uma vez por abertura: snapshot chegando não descarta a edição
  const initialized = useRef(false);
  useEffect(() => {
    if (open && !initialized.current) {
      form.reset(toFormValues(log));
      initialized.current = true;
    } else if (!open) {
      initialized.current = false;
    }
  }, [open, log, form]);

  function onSubmit(raw: FormValues) {
    const values = {
      jobId: raw.jobId === NO_JOB ? null : raw.jobId,
      date: new Date(`${raw.date}T12:00:00`),
      miles: Number(raw.miles),
      purpose: raw.purpose,
    };
    const mutation = log
      ? update.mutateAsync({ current: log, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{log ? dict.mileage.edit : dict.mileage.new}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
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
                name="miles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.miles}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fields.purpose}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fields.job}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_JOB}>{fields.noJob}</SelectItem>
                      {jobOptions.map((option) => (
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
