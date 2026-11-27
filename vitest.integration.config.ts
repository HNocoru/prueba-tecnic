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
    include: ["tests/integration/**/*.test.ts"],
    passWithNoTests: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
