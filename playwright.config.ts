import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // 1 retry local: o emulator do Firestore ocasionalmente trava um listen
  // target sob a carga da suite (doc nunca recebe resposta) — flake de
  // ambiente, não do app (passa em isolamento e em produção real)
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Persona primária usa celular no campo (SPEC §1) — viewport mobile obrigatório
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      // emulators:exec + keepalive: emulators:start morre quando o stdin
      // fecha (NPE no rules runtime) — caso de todo process manager
      command:
        'firebase emulators:exec --only auth,firestore,storage "node scripts/emulators-keepalive.cjs"',
      url: "http://127.0.0.1:9099",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // build de produção: elimina a flakiness da compilação on-demand do dev
      command: "pnpm build && pnpm start",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
