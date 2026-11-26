import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("env", () => {
  it("falla al importar si falta una variable del cliente", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    await expect(import("./env")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("expone los valores validados cuando las variables existen", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.WHATSAPP_APP_SECRET = "app-secret";
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
    process.env.WORKER_API_TOKEN = "worker-token";
    delete process.env.WHATSAPP_ACCESS_TOKEN;

    const mod = await import("./env");

    expect(mod.clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(mod.serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-key");
    expect(mod.serverEnv.WHATSAPP_APP_SECRET).toBe("app-secret");
    expect(mod.serverEnv.WHATSAPP_VERIFY_TOKEN).toBe("verify-token");
    expect(mod.serverEnv.WORKER_API_TOKEN).toBe("worker-token");
    expect(mod.serverEnv.WHATSAPP_ACCESS_TOKEN).toBeUndefined();
  });

  it("falla si falta WHATSAPP_APP_SECRET o WHATSAPP_VERIFY_TOKEN, sin imprimir valores", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WORKER_API_TOKEN;

    await expect(import("./env")).rejects.toThrow(
      /WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, WORKER_API_TOKEN/,
    );
  });
});
