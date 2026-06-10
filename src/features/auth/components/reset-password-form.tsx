"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { logger } from "@/lib/logger";

import { requestPasswordReset } from "../api";
import { createResetPasswordSchema, type ResetPasswordInput } from "../schemas";

export function ResetPasswordForm() {
  const dict = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(createResetPasswordSchema(dict)),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email);
    } catch (error) {
      // Resposta idêntica com email inexistente — sem enumeração de usuários
      logger.warn("password reset request failed", {
        code: error instanceof Error ? error.message : String(error),
      });
    }
    setSent(true);
    setSubmitting(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{dict.auth.resetTitle}</CardTitle>
        <CardDescription>{dict.auth.resetSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p role="status" className="text-sm text-muted-foreground">
            {dict.auth.resetSent}
          </p>
        ) : (
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.auth.email}</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? dict.common.loading : dict.auth.sendResetLink}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          {dict.auth.backToLogin}
        </Link>
      </CardFooter>
    </Card>
  );
}
