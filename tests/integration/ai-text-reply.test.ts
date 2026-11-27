import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ReplyToInboundMessage } from "@/modules/assistant/application/ReplyToInboundMessage";
import type { LlmPort, WhatsAppSenderPort } from "@/modules/assistant/application/ports";
import { SupabaseAssistantStore } from "@/modules/assistant/infrastructure/SupabaseAssistantStore";
import { BusinessContextReaderAdapter } from "@/modules/assistant/infrastructure/BusinessContextReaderAdapter";
import { composeBusinessContextForService } from "@/modules/business";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
// Llaves demo públicas de la CLI de Supabase local (no son secretos reales).
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tenantId = randomUUID();
const contactId = randomUUID();
const conversationId = randomUUID();
const inboundId = `wamid.IT-${randomUUID()}`;
const rateContactId = randomUUID();
const rateConversationId = randomUUID();
const rateInboundId = `wamid.IT-${randomUUID()}`;
const provider = "assistant";

const llm: LlmPort = {
  generate: async () => "Respuesta de prueba en español de México",
};
let sentBodies: string[] = [];
const sender: WhatsAppSenderPort = {
  sendText: async (_tenantId, _to, body) => {
    sentBodies.push(body);
    return `wamid.OUT-${randomUUID()}`;
  },
};

async function seedConversation(input: {
  contactId: string;
  conversationId: string;
  messageId: string;
  waId: string;
}) {
  const must = async (label: string, result: PromiseLike<{ error: unknown }>) => {
    const { error } = await result;
    expect(error, `siembra: ${label}`).toBeNull();
  };
  await must(
    "contacto",
    admin.from("contacts").insert({
      id: input.contactId,
      tenant_id: tenantId,
      wa_id: input.waId,
      phone_e164: "+525512345678",
    }),
  );
  await must(
    "conversación",
    admin.from("conversations").insert({
      id: input.conversationId,
      tenant_id: tenantId,
      contact_id: input.contactId,
    }),
  );
  await must(
    "mensaje entrante",
    admin.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: input.conversationId,
      direction: "inbound",
      kind: "text",
      body: "¿Tienen café?",
      wamid: input.messageId,
    }),
  );
}

beforeAll(async () => {
  await admin.from("webhook_events").delete().eq("provider", provider).eq("tenant_id", tenantId);
  await admin.from("messages").delete().eq("tenant_id", tenantId);
  await admin.from("conversations").delete().eq("tenant_id", tenantId);
  await admin.from("contacts").delete().eq("tenant_id", tenantId);
  await admin.from("assistant_configs").delete().eq("tenant_id", tenantId);
  await admin.from("business_profiles").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);

  const must = async (label: string, result: PromiseLike<{ error: unknown }>) => {
    const { error } = await result;
    expect(error, `siembra: ${label}`).toBeNull();
  };
  await must(
    "tenant",
    admin
      .from("tenants")
      .insert({ id: tenantId, slug: `assistant-${tenantId}`, name: "Café Aurora" }),
  );
  await must(
    "perfil",
    admin.from("business_profiles").insert({
      tenant_id: tenantId,
      legal_name: "Café Aurora",
      contact_phone: "+525599887766",
    }),
  );
  await must(
    "configuración del asistente",
    admin.from("assistant_configs").insert({
      tenant_id: tenantId,
      name: "Aurora",
      tone: "cercano",
      escalation_message: "Te paso con una persona",
    }),
  );
  await seedConversation({
    contactId,
    conversationId,
    messageId: inboundId,
    waId: "5215512345678",
  });
  await seedConversation({
    contactId: rateContactId,
    conversationId: rateConversationId,
    messageId: rateInboundId,
    waId: "5215510000001",
  });
});

afterAll(async () => {
  await admin.from("webhook_events").delete().eq("provider", provider).eq("tenant_id", tenantId);
  await admin.from("messages").delete().eq("tenant_id", tenantId);
  await admin.from("conversations").delete().eq("tenant_id", tenantId);
  await admin.from("contacts").delete().eq("tenant_id", tenantId);
  await admin.from("assistant_configs").delete().eq("tenant_id", tenantId);
  await admin.from("business_profiles").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
});

const makeUseCase = () => {
  const store = new SupabaseAssistantStore(admin);
  return new ReplyToInboundMessage({
    inbound: store,
    business: new BusinessContextReaderAdapter(composeBusinessContextForService()),
    history: store,
    llm,
    sender,
    messages: store,
    events: store,
  });
};

describe("S11 integración: inbound → outbound", () => {
  it("guarda el outbound en messages con direction='outbound'", async () => {
    sentBodies = [];
    const result = await makeUseCase().execute(tenantId, conversationId, inboundId);
    expect(result.status).toBe("sent");
    const { data, error } = await admin
      .from("messages")
      .select("direction,kind,body,wamid,tenant_id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({
      direction: "outbound",
      kind: "text",
      body: "Respuesta de prueba en español de México",
      tenant_id: tenantId,
    });
    expect(sentBodies).toEqual(["Respuesta de prueba en español de México"]);
  });

  it("idempotencia: el reintento no envía ni guarda otra respuesta", async () => {
    sentBodies = [];
    const result = await makeUseCase().execute(tenantId, conversationId, inboundId);
    expect(result).toEqual({ status: "skipped", reason: "duplicate" });
    const { data } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound");
    expect(data).toHaveLength(1);
    expect(sentBodies).toEqual([]);
  });

  it("tope por hora: con 20 outbound no se envía una respuesta nueva", async () => {
    const rows = Array.from({ length: 20 }, () => ({
      tenant_id: tenantId,
      conversation_id: rateConversationId,
      direction: "outbound",
      kind: "text",
      body: "llenado",
      occurred_at: new Date().toISOString(),
    }));
    const { error } = await admin.from("messages").insert(rows);
    expect(error).toBeNull();
    sentBodies = [];
    const result = await makeUseCase().execute(tenantId, rateConversationId, rateInboundId);
    expect(result).toEqual({ status: "skipped", reason: "rate_limited" });
    expect(sentBodies).toEqual([]);
  });
});
