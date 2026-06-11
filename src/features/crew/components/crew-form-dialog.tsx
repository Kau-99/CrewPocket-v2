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
import type { Dictionary } from "@/i18n";
import { useTranslation } from "@/hooks/use-translation";
import { centsToDollarsString, dollarsToCents } from "@/lib/utils";

import { useCrewMutations } from "../hooks/use-crew";
import type { CrewMember } from "../schemas";

interface CrewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: CrewMember | undefined;
}

function buildSchema(dict: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, dict.forms.required).max(120),
    role: z.string().max(80),
    phone: z.string().max(30),
    email: z.string().email(dict.forms.emailInvalid).or(z.literal("")),
    hourlyRate: z
      .string()
      .refine((value) => dollarsToCents(value) !== null, dict.errors.validation),
    certifications: z.string().max(500),
    status: z.enum(["active", "inactive"]),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(member: CrewMember | undefined): FormValues {
  return {
    name: member?.name ?? "",
    role: member?.role ?? "",
    phone: member?.phone ?? "",
    email: member?.email ?? "",
    hourlyRate: member ? centsToDollarsString(member.hourlyRateCents) : "25.00",
    certifications: member?.certifications ?? "",
    status: member?.status ?? "active",
  };
}

export function CrewFormDialog({ open, onOpenChange, member }: CrewFormDialogProps) {
  const dict = useTranslation();
  const fields = dict.crew.fields;
  const schema = useMemo(() => buildSchema(dict), [dict]);
  const { create, update } = useCrewMutations({
    onDone: () => {
      onOpenChange(false);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(undefined),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(member));
  }, [open, member, form]);

  function onSubmit(raw: FormValues) {
    const values = {
      name: raw.name,
      role: raw.role,
      phone: raw.phone,
      email: raw.email,
      hourlyRateCents: dollarsToCents(raw.hourlyRate) ?? 0,
      certifications: raw.certifications,
      status: raw.status,
    };
    const mutation = member
      ? update.mutateAsync({ current: member, values })
      : create.mutateAsync(values);
    mutation.catch(() => toast.error(dict.errors.unknown));
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? dict.crew.edit : dict.crew.new}</DialogTitle>
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.role}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.hourlyRate}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.phone}</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.email}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.certifications}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fields.status}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{dict.crew.statuses.active}</SelectItem>
                        <SelectItem value="inactive">{dict.crew.statuses.inactive}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
