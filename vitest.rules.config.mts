import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Config separada para os testes de Firestore Rules: ambiente node e
 * emulator obrigatório. Rodar via `pnpm test:rules` (emulators:exec).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Um único worker: os testes compartilham o estado do emulator
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
