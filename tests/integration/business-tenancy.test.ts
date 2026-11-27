import { describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const TENANT_A = "00000000-0000-4000-8000-000000000001";
const TENANT_B = "00000000-0000-4000-8000-000000000002";

async function ensureTenants() {
  await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([
      { id: TENANT_A, slug: "tenant-a-test", name: "Tenant A Test" },
      { id: TENANT_B, slug: "tenant-b-test", name: "Tenant B Test" },
    ]),
  });
}

async function rest(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

describe("Aislamiento de negocio entre tenants (Supabase local)", () => {
  it("el tenant B no lee ni escribe lo del tenant A en business_profiles", async () => {
    await ensureTenants();

    const upA = await rest("business_profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        tenant_id: TENANT_A,
        legal_name: "Negocio A",
        timezone: "America/Mexico_City",
      }),
    });
    expect([200, 201, 204]).toContain(upA.status);

    const readA = await rest(`business_profiles?tenant_id=eq.${TENANT_A}&select=legal_name`);
    expect(readA.ok).toBe(true);
    const dataA = (await readA.json()) as Array<{ legal_name: string | null }>;
    expect(dataA[0]?.legal_name).toBe("Negocio A");

    const readB = await rest(`business_profiles?tenant_id=eq.${TENANT_B}&select=legal_name`);
    expect(readB.ok).toBe(true);
    const dataB = (await readB.json()) as Array<{ legal_name: string | null }>;
    expect(dataB.every((r) => r.legal_name !== "Negocio A")).toBe(true);
  });

  it("aísla horarios por tenant", async () => {
    await ensureTenants();
    await rest(`business_hours?tenant_id=eq.${TENANT_A}`, { method: "DELETE" });
    await rest(`business_hours?tenant_id=eq.${TENANT_B}`, { method: "DELETE" });

    const ins = await rest("business_hours", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{ tenant_id: TENANT_A, weekday: 1, opens: "09:00", closes: "18:00" }]),
    });
    expect([200, 201]).toContain(ins.status);

    const a = (await (
      await rest(`business_hours?tenant_id=eq.${TENANT_A}&select=weekday,opens,closes`)
    ).json()) as Array<{ weekday: number }>;
    const b = (await (
      await rest(`business_hours?tenant_id=eq.${TENANT_B}&select=weekday,opens,closes`)
    ).json()) as Array<{ weekday: number }>;
    expect(a.some((h) => h.weekday === 1)).toBe(true);
    expect(b.some((h) => h.weekday === 1)).toBe(false);
  });

  it("aísla catálogo por tenant", async () => {
    await ensureTenants();
    await rest(`catalog_items?tenant_id=eq.${TENANT_A}`, { method: "DELETE" });
    await rest(`catalog_items?tenant_id=eq.${TENANT_B}`, { method: "DELETE" });

    const ins = await rest("catalog_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          tenant_id: TENANT_A,
          kind: "service",
          name: "Solo A",
          price: 10,
          currency: "MXN",
          active: true,
        },
      ]),
    });
    expect([200, 201]).toContain(ins.status);

    const a = (await (
      await rest(`catalog_items?tenant_id=eq.${TENANT_A}&select=name`)
    ).json()) as Array<{ name: string }>;
    const b = (await (
      await rest(`catalog_items?tenant_id=eq.${TENANT_B}&select=name`)
    ).json()) as Array<{ name: string }>;
    expect(a.some((i) => i.name === "Solo A")).toBe(true);
    expect(b.some((i) => i.name === "Solo A")).toBe(false);
  });

  it("aísla FAQs por tenant", async () => {
    await ensureTenants();
    await rest(`faqs?tenant_id=eq.${TENANT_A}`, { method: "DELETE" });
    await rest(`faqs?tenant_id=eq.${TENANT_B}`, { method: "DELETE" });

    const ins = await rest("faqs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        { tenant_id: TENANT_A, question: "¿Solo A?", answer: "Sí", position: 0 },
      ]),
    });
    expect([200, 201]).toContain(ins.status);

    const a = (await (
      await rest(`faqs?tenant_id=eq.${TENANT_A}&select=question`)
    ).json()) as Array<{ question: string }>;
    const b = (await (
      await rest(`faqs?tenant_id=eq.${TENANT_B}&select=question`)
    ).json()) as Array<{ question: string }>;
    expect(a.some((f) => f.question === "¿Solo A?")).toBe(true);
    expect(b.some((f) => f.question === "¿Solo A?")).toBe(false);
  });
});
