import { describe, expect, it } from "vitest";

import { en } from "@/i18n/en";

import { createLoginSchema, createResetPasswordSchema, createSignupSchema } from "../schemas";

describe("auth schemas", () => {
  const login = createLoginSchema(en);
  const signup = createSignupSchema(en);
  const reset = createResetPasswordSchema(en);

  it("accepts valid login input", () => {
    expect(login.safeParse({ email: "a@b.com", password: "secret1" }).success).toBe(true);
  });

  it("rejects invalid email and short password", () => {
    expect(login.safeParse({ email: "nope", password: "secret1" }).success).toBe(false);
    expect(login.safeParse({ email: "a@b.com", password: "12345" }).success).toBe(false);
  });

  it("signup requires matching passwords", () => {
    const base = { email: "a@b.com", password: "secret1" };
    expect(signup.safeParse({ ...base, confirmPassword: "secret1" }).success).toBe(true);

    const mismatch = signup.safeParse({ ...base, confirmPassword: "different" });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
      expect(mismatch.error.issues[0]?.message).toBe(en.forms.passwordsDontMatch);
    }
  });

  it("reset requires a valid email", () => {
    expect(reset.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(reset.safeParse({ email: "" }).success).toBe(false);
  });
});
