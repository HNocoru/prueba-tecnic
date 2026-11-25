import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
    conditions: ["react-server", "node", "default"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server", "node", "default"],
    },
  },
  test: {
    environment: "node",
    include: ["modules/**/*.test.ts", "shared/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["modules/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
