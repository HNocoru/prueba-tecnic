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
    // Los archivos comparten una sola base local y algunos limpian tablas en su preparación
    // (p. ej. whatsapp_numbers): en paralelo se pisan entre sí. Se ejecutan en serie.
    fileParallelism: false,
    passWithNoTests: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
