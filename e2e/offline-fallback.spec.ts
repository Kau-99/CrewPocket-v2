import { expect, test } from "@playwright/test";

/**
 * Navegação offline sem cache → página /~offline servida pelo SW
 * (regressão de produção: FetchEvent /login → no-response → erro do browser).
 */
test("navegação offline sem cache cai no fallback /~offline", async ({ page, context }) => {
  await page.goto("/");
  // o precache (incluindo /~offline) conclui antes do SW ativar
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.goto("/reset-password").catch(() => undefined);

  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible({
    timeout: 15_000,
  });
  await context.setOffline(false);
});
