import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { mapAuthError, safeReturnTo } from "../utils";

describe("mapAuthError", () => {
  it.each([
    ["auth/invalid-credential", "invalidCredentials"],
    ["auth/wrong-password", "invalidCredentials"],
    ["auth/user-not-found", "invalidCredentials"],
    ["auth/email-already-in-use", "emailInUse"],
    ["auth/weak-password", "weakPassword"],
    ["auth/too-many-requests", "tooManyRequests"],
    ["auth/unauthorized-domain", "networkOrConfig"],
    ["auth/network-request-failed", "networkOrConfig"],
    ["auth/some-new-code", "unknown"],
  ])("maps %s → %s", (code, expected) => {
    expect(mapAuthError(new FirebaseError(code, "msg"))).toBe(expected);
  });

  it("popup fechado pelo usuário é silencioso (null)", () => {
    expect(mapAuthError(new FirebaseError("auth/popup-closed-by-user", "msg"))).toBeNull();
    expect(mapAuthError(new FirebaseError("auth/cancelled-popup-request", "msg"))).toBeNull();
  });

  it("non-Firebase errors → unknown", () => {
    expect(mapAuthError(new Error("boom"))).toBe("unknown");
    expect(mapAuthError("string")).toBe("unknown");
  });
});

describe("safeReturnTo", () => {
  it("accepts internal paths", () => {
    expect(safeReturnTo("/jobs/123")).toBe("/jobs/123");
  });

  it("falls back to /dashboard on external or malformed values (open redirect)", () => {
    expect(safeReturnTo(null)).toBe("/dashboard");
    expect(safeReturnTo("https://evil.example")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/dashboard");
    expect(safeReturnTo("")).toBe("/dashboard");
  });
});
