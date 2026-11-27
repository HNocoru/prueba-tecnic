import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3200);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Los archivos pueden correr en paralelo con PLAYWRIGHT_WORKERS=N; dentro de un archivo las
  // pruebas siguen en serie. Por defecto 1: comparten el tenant demo y la base local.
  fullyParallel: false,
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 1),
  retries: 0,
  timeout: 45000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // La suite es dueña de su servidor (requiere `pnpm build` previo). El entorno de
  // Supabase se hereda de quien invoca el comando; no se escriben secretos aquí.
  // reuseExistingServer=false: si el puerto está ocupado falla rápido en vez de
  // probar en silencio un servidor viejo con código desactualizado.
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  outputDir: "/tmp/playwright-artifacts",
});
