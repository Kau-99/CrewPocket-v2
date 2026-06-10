/**
 * Proibições da SPEC §2 codificadas como erros.
 * Features são ilhas (SPEC §3.2.1): zonas geradas a partir de FEATURES (ADR-006).
 * Nova feature => adicionar o nome aqui.
 */
const FEATURES = [
  "jobs",
  "clients",
  "estimates",
  "invoices",
  "crew",
  "time-tracking",
  "mileage",
  "inventory",
  "pricebook",
  "settings",
  "billing",
  "dashboard",
  "analytics",
  "attic-estimator",
  "auth",
  "calendar",
  "field",
  "notifications",
];

const crossFeatureZones = FEATURES.map((feature) => ({
  target: `./src/features/${feature}`,
  from: FEATURES.filter((other) => other !== feature).map((other) => `./src/features/${other}`),
  message: `Features são ilhas (SPEC §3.2.1): "${feature}" não pode importar de outra feature. Extraia para lib/, hooks/ ou components/.`,
}));

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "prettier",
  ],
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "coverage/",
    "playwright-report/",
    "test-results/",
    "public/",
    "next-env.d.ts",
    "*.config.ts",
    "*.config.mts",
    "*.config.mjs",
    "*.config.cjs",
    ".eslintrc.cjs",
  ],
  rules: {
    // SPEC §2: `any` proibido sem disable justificado
    "@typescript-eslint/no-explicit-any": "error",
    // SPEC §2: console.log proibido (logger central usa disable sancionado)
    "no-console": ["error", { allow: ["warn", "error"] }],
    // SPEC §2: alert/confirm/prompt proibidos
    "no-alert": "error",
    // SPEC §2: dangerouslySetInnerHTML proibido
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "dangerouslySetInnerHTML é proibido (SPEC §2).",
      },
      {
        selector: "Property[key.name='dangerouslySetInnerHTML']",
        message: "dangerouslySetInnerHTML é proibido (SPEC §2).",
      },
    ],
    // SPEC §3.2.1: fronteiras entre features
    "import/no-restricted-paths": ["error", { zones: crossFeatureZones }],
    // Números em template literals são seguros (ids, contadores, centavos)
    "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "e2e/**"],
      rules: {
        // Padrões idiomáticos de teste (expect().toBe etc. já são seguros)
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
      },
    },
  ],
};
