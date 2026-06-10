import { expect, test } from "@playwright/test";

test("health endpoint responds ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { ok: boolean };
  expect(body.ok).toBe(true);
});

test("landing renders and security headers are present", async ({ page }) => {
  const response = await page.goto("/");
  expect(response, "navigation should produce a response").toBeTruthy();

  const headers = response?.headers() ?? {};
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("CrewPocket");
});
