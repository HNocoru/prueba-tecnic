import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@example.com";
export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "DemoPassword123!";

export const TENANT_ID = "00000000-0000-4000-8000-000000000001";

// Supabase local: la URL y la llave de servicio salen del entorno o, si no hay,
// de la llave demo pública de la CLI de Supabase (solo válida en local).
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const LOCAL_DEMO_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** Cliente con service role para sembrar y limpiar datos del propio test. */
export function adminClient(): SupabaseClient {
  return createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_DEMO_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Ids del seed de supabase/seed.sql (bandeja demo S06). */
export const SEED = {
  ana: {
    conversation: "00000000-0000-4000-8000-0000000000b1",
    name: "Ana Torres",
    status: "Pendiente",
  },
  bruno: {
    conversation: "00000000-0000-4000-8000-0000000000b2",
    name: "Bruno Salas",
    status: "En proceso",
  },
  carla: {
    conversation: "00000000-0000-4000-8000-0000000000b3",
    name: "Carla Méndez",
    status: "Completado",
  },
  diego: {
    conversation: "00000000-0000-4000-8000-0000000000b4",
    name: "Diego Ramos",
    status: "Cancelado",
  },
  elena: {
    conversation: "00000000-0000-4000-8000-0000000000b5",
    name: "Elena Prado",
    status: "Sin estado",
  },
} as const;

export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('input[name="email"]', DEMO_EMAIL);
  await page.fill('input[name="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/home**");
}

/** Espera a que la suscripción Realtime esté activa y el refresco inicial haya pasado. */
export async function waitForLive(page: Page): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: "En vivo" })).toBeVisible({
    timeout: 15000,
  });
  // El primer SUBSCRIBED programa un refresh con debounce de 300 ms.
  await page.waitForTimeout(1000);
}

export function conversationList(page: Page) {
  return page.locator('section[aria-label="Conversaciones"]:visible');
}

export function conversationItems(page: Page) {
  return conversationList(page).locator("ul > li:has(a)");
}
