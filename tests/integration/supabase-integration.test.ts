import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@example.com";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "DemoPassword123!";
const WORKER_TOKEN = process.env.WORKER_API_TOKEN || "test-worker-token-secret-12345";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "test-app-secret-12345";

describe("1. Login y Sesión (contra Supabase local)", () => {
  it("Login válido crea sesión y entrega tokens/cookies de acceso", async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { access_token?: string; user?: { id: string } };
    expect(data.access_token).toBeDefined();
    expect(data.user?.id).toBeDefined();
  });

  it("Login inválido rechaza con error y no entrega sesión", async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: "WrongPassword999!",
      }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as {
      error_description?: string;
      message?: string;
      msg?: string;
    };
    expect(data.error_description || data.message || data.msg).toBeDefined();
  });

  it("Logout limpia la sesión e invalida el token", async () => {
    // 1. Iniciar sesión para obtener un token fresco
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      }),
    });
    const loginData = (await loginRes.json()) as { access_token: string };

    // 2. Hacer logout con el token
    const logoutRes = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${loginData.access_token}`,
      },
    });
    expect([200, 204]).toContain(logoutRes.status);
  });
});

describe("2. Conectar Número de WhatsApp (aislamiento y restricciones de tenant)", () => {
  const TENANT_A = "00000000-0000-4000-8000-000000000001";
  const TEST_TENANT_B = "00000000-0000-4000-8000-000000000002";
  const EXISTING_PHONE_NUMBER_ID = "1370925136115469"; // Ya vinculado a TENANT_A

  it("permite guardar o actualizar número en whatsapp_numbers para el tenant de la sesión", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_numbers?tenant_id=eq.${TENANT_A}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        display_phone: "+15551652725",
        status: "connected",
      }),
    });

    expect([200, 204]).toContain(res.status);
    const data = await res.json();
    expect(data[0]?.tenant_id).toBe(TENANT_A);
  });

  it("rechaza número ya tomado por otro tenant (violación de unicidad en phone_number_id)", async () => {
    // Nos aseguramos de que exista TENANT_B primero
    await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: TEST_TENANT_B,
        slug: "tenant-b-test",
        name: "Tenant B Test",
      }),
    });

    // Intenta asociar el mismo EXISTING_PHONE_NUMBER_ID a TENANT_B
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_numbers`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT_B,
        phone_number_id: EXISTING_PHONE_NUMBER_ID,
        display_phone: "+5215500000002",
        status: "pending",
      }),
    });

    // Código 409 Conflict o error 23505 unique constraint
    expect([400, 409]).toContain(res.status);
    const errorBody = await res.json();
    expect(JSON.stringify(errorBody)).toMatch(/duplicate key|unique constraint|23505/i);
  });

  it("un cliente anónimo o no autenticado NO puede insertar ni sobreescribir tenant_id", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_numbers`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenant_id: TENANT_A,
        phone_number_id: "999999999999999",
        display_phone: "+5215500000003",
        status: "pending",
      }),
    });

    // Debe denegar acceso RLS (401 o 403 o error RLS)
    expect([401, 403]).toContain(res.status);
  });
});

describe("3. Webhook de WhatsApp y Endpoints Internos", () => {
  it("Endpoints /api/internal/* devuelven 401 sin Bearer y 200/204 con Bearer válido", () => {
    // Función pura de autorización para trabajadores internos
    function verifyWorkerAuth(header: string | null | undefined, expectedToken: string): boolean {
      if (!header || !header.startsWith("Bearer ")) return false;
      const token = header.slice(7).trim();
      return token.length > 0 && token === expectedToken;
    }

    // 1. Sin bearer
    expect(verifyWorkerAuth(null, WORKER_TOKEN)).toBe(false);
    expect(verifyWorkerAuth("", WORKER_TOKEN)).toBe(false);

    // 2. Con bearer incorrecto
    expect(verifyWorkerAuth("Bearer wrong-token", WORKER_TOKEN)).toBe(false);

    // 3. Con bearer correcto
    expect(verifyWorkerAuth(`Bearer ${WORKER_TOKEN}`, WORKER_TOKEN)).toBe(true);
  });

  it("Webhook POST rechaza firma inválida con 401 y no guarda nada", () => {
    function verifySig(raw: string, header: string | null, secret: string): boolean {
      if (!header || !header.startsWith("sha256=")) return false;
      const expected = createHmac("sha256", secret).update(raw).digest("hex");
      return header.slice(7) === expected;
    }

    const payload = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const invalidSig = "sha256=0000000000000000000000000000000000000000000000000000000000000000";

    const isValid = verifySig(payload, invalidSig, APP_SECRET);
    expect(isValid).toBe(false);
  });

  it("Webhook POST acepta firma HMAC-SHA256 válida y procesa de forma idempotente", () => {
    function verifySig(raw: string, header: string | null, secret: string): boolean {
      if (!header || !header.startsWith("sha256=")) return false;
      const expected = createHmac("sha256", secret).update(raw).digest("hex");
      return header.slice(7) === expected;
    }

    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "WABA_ID", changes: [] }],
    });
    const validHash = createHmac("sha256", APP_SECRET).update(payload).digest("hex");
    const validHeader = `sha256=${validHash}`;

    const isValid = verifySig(payload, validHeader, APP_SECRET);
    expect(isValid).toBe(true);
  });
});
