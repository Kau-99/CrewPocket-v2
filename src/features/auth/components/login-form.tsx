"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";

import { signInWithEmail, signInWithGoogle } from "../api";
import { createLoginSchema, type LoginInput } from "../schemas";
import { mapAuthError, safeReturnTo } from "../utils";
import { GoogleButton } from "./google-button";

export function LoginForm() {
  const dict = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(createLoginSchema(dict)),
    defaultValues: { email: "", password: "" },
  });

  function handleError(error: unknown) {
    const key = mapAuthError(error);
    if (key) toast.error(dict.auth.errors[key]);
    setSubmitting(false);
  }

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      await signInWithEmail(values.email, values.password);
      router.replace(returnTo);
    } catch (error) {
      handleError(error);
    }
  }

  async function onGoogle() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace(returnTo);
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{dict.auth.loginTitle}</CardTitle>
        <CardDescription>{dict.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleButton
          label={dict.auth.continueWithGoogle}
          disabled={submitting}
          onClick={() => void onGoogle()}
        />
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase text-muted-foreground">{dict.auth.or}</span>
          <Separator className="flex-1" />
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{dict.auth.password}</FormLabel>
                    <Link href="/reset-password" className="text-xs text-primary hover:underline">
                      {dict.auth.forgotPassword}
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? dict.common.loading : dict.auth.logIn}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {dict.auth.noAccount}&nbsp;
        <Link href="/signup" className="text-primary hover:underline">
          {dict.auth.signUp}
        </Link>
      </CardFooter>
    </Card>
  );
}
