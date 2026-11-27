import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ConnectWhatsAppNumber } from "@/modules/channels/whatsapp/application/ConnectWhatsAppNumber";
import type { WhatsAppNumberLookup } from "@/modules/channels/whatsapp/application/ports";
import { SupabaseWhatsAppNumberStore } from "@/modules/channels/whatsapp/infrastructure/SupabaseWhatsAppNumberStore";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TENANT_A = "00000000-0000-4000-8000-000000000001";
const TENANT_B = "00000000-0000-4000-8000-000000000002";
const PHONE_A = "1370925136115469";
const PHONE_B = "1370925136115470";

const lookup: WhatsAppNumberLookup = {
  async listPhoneNumbers() {
    return [
      { phoneNumberId: PHONE_A, displayPhone: "5215512345678" },
      { phoneNumberId: PHONE_B, displayPhone: "5215512345679" },
    ];
  },
};

function admin() {
  if (!SERVICE_ROLE_KEY) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureTenants() {
  const db = admin();
  await db.from("tenants").upsert([
    { id: TENANT_A, slug: "tenant-a-test", name: "Tenant A Test" },
    { id: TENANT_B, slug: "tenant-b-test", name: "Tenant B Test" },
  ]);
  await db.from("whatsapp_numbers").delete().eq("tenant_id", TENANT_A);
  await db.from("whatsapp_numbers").delete().eq("tenant_id", TENANT_B);
}

describe("Ligar número visible contra Supabase local", () => {
  it("guarda pending y mantiene la unicidad del id entre tenants", async () => {
    await ensureTenants();
    const store = new SupabaseWhatsAppNumberStore(admin());
    const uc = new ConnectWhatsAppNumber(store, lookup, { wabaId: "WABA-TEST" });

    const first = await uc.execute(TENANT_A, { displayPhone: "+52 1 55 1234 5678" });
    expect(first).toEqual({ ok: true });

    const saved = await store.findByTenant(TENANT_A);
    expect(saved).toEqual({
      phoneNumberId: PHONE_A,
      displayPhone: "+5215512345678",
      status: "pending",
    });

    const duplicate = await uc.execute(TENANT_B, { displayPhone: "+5215512345678" });
    expect(duplicate).toEqual({
      ok: false,
      error: "Ese número ya está conectado a otro negocio.",
    });
    expect(await store.findByTenant(TENANT_B)).toBeNull();

    const other = await uc.execute(TENANT_B, { displayPhone: "+5215512345679" });
    expect(other).toEqual({ ok: true });
    expect((await store.findByTenant(TENANT_B))?.phoneNumberId).toBe(PHONE_B);
  });
});
