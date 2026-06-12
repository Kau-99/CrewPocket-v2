import { expect, test } from "@playwright/test";

/** A landing precisa dar entrada no app — regressão da Fase 7 pós-deploy. */
test("landing tem CTAs de login e signup funcionando", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Start your 14-day free trial" })).toBeVisible();

  await page.getByRole("link", { name: "Get started" }).click();
  await page.waitForURL(/\/signup$/, { timeout: 15_000 });
  await expect(page.getByLabel("Email")).toBeVisible();
});
