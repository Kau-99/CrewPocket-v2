import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Alvo de cobertura da SPEC §10: ≥ 85% em features/*/utils.ts e schemas.ts
      include: ["src/features/**/utils.ts", "src/features/**/schemas.ts", "src/lib/**/*.ts"],
      thresholds: {
        // sobe para 85 quando features existirem (Fase 2)
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
