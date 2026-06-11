import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Config separada para testes que exigem o Firestore EMULATOR:
 * rules (tests/rules) e webhook do Stripe (tests/server).
 * Rodar via `pnpm test:rules` (emulators:exec).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // "server-only" lança fora do React Server — stub vazio nos testes node
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts", "tests/server/**/*.test.ts"],
    setupFiles: ["./tests/server/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Um único worker: os testes compartilham o estado do emulator
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
