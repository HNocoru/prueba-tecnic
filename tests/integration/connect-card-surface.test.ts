import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GetWhatsAppConnection } from "@/modules/channels/whatsapp/application/GetWhatsAppConnection";
import { SupabaseWhatsAppNumberStore } from "@/modules/channels/whatsapp/infrastructure/SupabaseWhatsAppNumberStore";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT = "33333333-3333-4333-8333-333333333333";
const PHONE_ID = "910000000000021";

function admin() {
  if (!SERVICE_ROLE_KEY) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("S21 · modelo de la tarjeta contra Supabase local", () => {
  beforeAll(async () => {
    const db = admin();
    await db.from("tenants").upsert({
      id: TENANT,
      slug: "s21-connect-card-test",
      name: "S21 Connect Card Test",
    });
    await db.from("whatsapp_numbers").delete().eq("tenant_id", TENANT);
    await db.from("whatsapp_numbers").upsert({
      tenant_id: TENANT,
      phone_number_id: PHONE_ID,
      display_phone: "+5215512345678",
      status: "pending",
    });
  });

  afterAll(async () => {
    const db = admin();
    await db.from("whatsapp_numbers").delete().eq("tenant_id", TENANT);
    await db.from("tenants").delete().eq("id", TENANT);
  });

  it("devuelve solo estado y número visible, sin datos de plataforma", async () => {
    const view = await new GetWhatsAppConnection(new SupabaseWhatsAppNumberStore(admin())).execute(
      TENANT,
    );

    expect(view).toEqual({ status: "pending", displayPhone: "+5215512345678" });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain(PHONE_ID);
    expect(serialized).not.toMatch(/webhook|verify|token|meta|phone_number_id|\bapi\b/i);
  });
});
