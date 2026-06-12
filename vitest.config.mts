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
      // Escopo da SPEC §10: ≥ 85% em features/*/utils.ts e schemas.ts
      // (lib/totals e lib/utils também cobertas; stripe/webhook tem suite
      // própria contra o emulator em tests/server)
      include: ["src/features/**/utils.ts", "src/features/**/schemas.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});
