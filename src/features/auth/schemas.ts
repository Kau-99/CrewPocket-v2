import { z } from "zod";

import type { Dictionary } from "@/i18n";

/**
 * Schemas como factories para que as mensagens de validação venham do
 * dicionário ativo (SPEC §8: i18n em toda a UI).
 */
export function createLoginSchema(dict: Dictionary) {
  return z.object({
    email: z.string().min(1, dict.forms.required).email(dict.forms.emailInvalid),
    password: z.string().min(6, dict.forms.passwordMin),
  });
}

export function createSignupSchema(dict: Dictionary) {
  return createLoginSchema(dict)
    .extend({
      confirmPassword: z.string().min(1, dict.forms.required),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: dict.forms.passwordsDontMatch,
      path: ["confirmPassword"],
    });
}

export function createResetPasswordSchema(dict: Dictionary) {
  return z.object({
    email: z.string().min(1, dict.forms.required).email(dict.forms.emailInvalid),
  });
}

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type SignupInput = z.infer<ReturnType<typeof createSignupSchema>>;
export type ResetPasswordInput = z.infer<ReturnType<typeof createResetPasswordSchema>>;
