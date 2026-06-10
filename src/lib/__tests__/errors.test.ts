import { describe, expect, it } from "vitest";

import { AppError, isAppError, toAppError } from "@/lib/errors";

describe("AppError", () => {
  it("carries a typed code and defaults message to the code", () => {
    const error = new AppError("offline");
    expect(error.code).toBe("offline");
    expect(error.message).toBe("offline");
    expect(isAppError(error)).toBe(true);
  });

  it("preserves cause", () => {
    const cause = new Error("boom");
    const error = new AppError("unknown", "wrapped", { cause });
    expect(error.cause).toBe(cause);
  });
});

describe("toAppError", () => {
  it("passes AppError through unchanged", () => {
    const original = new AppError("validation");
    expect(toAppError(original)).toBe(original);
  });

  it("wraps Error and non-Error values as unknown", () => {
    expect(toAppError(new Error("x")).code).toBe("unknown");
    expect(toAppError("string failure").code).toBe("unknown");
    expect(toAppError("string failure").message).toBe("string failure");
  });
});
