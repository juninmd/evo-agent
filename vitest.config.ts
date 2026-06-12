import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/fixtures/**",
        "src/agent/benchmark-cli.ts",
        "src/observability/health-cli.ts",
        "src/index.ts",
      ],
      thresholds: {
        lines: 40,
        functions: 35,
        statements: 40,
        branches: 35,
      },
    },
  },
});
