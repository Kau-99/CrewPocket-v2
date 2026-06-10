"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";

import { createSettings } from "../api";

/** Onboarding mínimo do primeiro login: só o nome da empresa (SPEC §11 Fase 1). */
export function OnboardingForm() {
  const dict = useTranslation();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const schema = z.object({
    companyName: z.string().trim().min(1, dict.forms.companyNameRequired).max(120),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { companyName: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!user) return;
    setSubmitting(true);
    try {
      await createSettings(user.uid, values.companyName);
      // o onSnapshot de useSettings troca a tela sozinho
    } catch {
      toast.error(dict.errors.unknown);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{dict.onboarding.title}</CardTitle>
          <CardDescription>{dict.onboarding.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            >
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.onboarding.companyName}</FormLabel>
                    <FormControl>
                      <Input placeholder={dict.onboarding.companyNamePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? dict.common.loading : dict.onboarding.getStarted}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
