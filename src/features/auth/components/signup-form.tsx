"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

import { signInWithGoogle, signUpWithEmail } from "../api";
import { createSignupSchema, type SignupInput } from "../schemas";
import { mapAuthError } from "../utils";
import { GoogleButton } from "./google-button";

export function SignupForm() {
  const dict = useTranslation();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(createSignupSchema(dict)),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  function handleError(error: unknown) {
    const key = mapAuthError(error);
    if (key) toast.error(dict.auth.errors[key]);
    setSubmitting(false);
  }

  async function onSubmit(values: SignupInput) {
    setSubmitting(true);
    try {
      await signUpWithEmail(values.email, values.password);
      toast.success(dict.auth.verificationSent);
      router.replace("/dashboard");
    } catch (error) {
      handleError(error);
    }
  }

  async function onGoogle() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{dict.auth.signupTitle}</CardTitle>
        <CardDescription>{dict.auth.signupSubtitle}</CardDescription>
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
                  <FormLabel>{dict.auth.password}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.auth.confirmPassword}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? dict.common.loading : dict.auth.signUp}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {dict.auth.haveAccount}&nbsp;
        <Link href="/login" className="text-primary hover:underline">
          {dict.auth.logIn}
        </Link>
      </CardFooter>
    </Card>
  );
}
