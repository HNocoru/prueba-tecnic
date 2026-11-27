import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ReplyToInboundMessage } from "@/modules/assistant/application/ReplyToInboundMessage";
import type {
  ConversationSummaryRequest,
  LlmPort,
  WhatsAppSenderPort,
} from "@/modules/assistant/application/ports";
import { BusinessContextReaderAdapter } from "@/modules/assistant/infrastructure/BusinessContextReaderAdapter";
import { SupabaseAssistantStore } from "@/modules/assistant/infrastructure/SupabaseAssistantStore";
import { SupabaseTextMemoryReader } from "@/modules/assistant/infrastructure/SupabaseTextMemoryReader";
import { composeBusinessContextForService } from "@/modules/business";
import { SupabaseCallMemoryRepository } from "@/modules/memory/infrastructure/SupabaseCallMemoryRepository";
import { SummarizeConversation } from "@/modules/memory/application/SummarizeConversation";
import type { SummaryLlmPort } from "@/modules/memory/application/ports";
import type { Database } from "@/shared/db";

const URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const db: SupabaseClient<Database> = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tenantA = randomUUID();
const tenantB = randomUUID();
const contactA = randomUUID();
const contactB = randomUUID();
const conversationA = randomUUID();
const conversationB = randomUUID();
const inboundA = `wamid.S22-A-${randomUUID()}`;
const inboundB = `wamid.S22-B-${randomUUID()}`;
const inboundThreshold = `wamid.S22-TH-${randomUUID()}`;
const waA = `52155${Date.now()}`;
const waB = `52156${Date.now()}`;

const replyLlm: LlmPort & { systems: string[] } = {
  systems: [],
  async generate(system: string) {
    this.systems.push(system);
    return "Sí, le tengo una mesa reservada.";
  },
};
const summaryLlm: SummaryLlmPort = {
  generateSummary: async () =>
    JSON.stringify({ summary: "Confirmó la reserva para mañana", facts: { mesa: "2" } }),
};
const sender: WhatsAppSenderPort = {
  sendText: async () => `wamid.OUT-${randomUUID()}`,
};

async function must(label: string, result: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await result;
  expect(error, `siembra: ${label}`).toBeNull();
}

async function seedTenant(tenant: string, slug: string, name: string): Promise<void> {
  await must("tenant", db.from("tenants").insert({ id: tenant, slug, name }));
  await must(
    "perfil",
    db.from("business_profiles").insert({ tenant_id: tenant, legal_name: name }),
  );
  await must(
    "configuración",
    db
      .from("assistant_configs")
      .insert({ tenant_id: tenant, name: "Aurora", escalation_message: "Te paso con una persona" }),
  );
}

async function seed(): Promise<void> {
  await seedTenant(tenantA, `s22-a-${waA}`, "Café Aurora");
  await seedTenant(tenantB, `s22-b-${waB}`, "Café Boreal");

  await must(
    "contacto A",
    db.from("contacts").insert({ id: contactA, tenant_id: tenantA, wa_id: waA }),
  );
  await must(
    "contacto B",
    db.from("contacts").insert({ id: contactB, tenant_id: tenantB, wa_id: waB }),
  );
  await must(
    "conversación A",
    db
      .from("conversations")
      .insert({ id: conversationA, tenant_id: tenantA, contact_id: contactA }),
  );
  await must(
    "conversación B",
    db
      .from("conversations")
      .insert({ id: conversationB, tenant_id: tenantB, contact_id: contactB }),
  );

  await must(
    "memoria A",
    db.from("contact_memory").insert({
      tenant_id: tenantA,
      contact_id: contactA,
      summary: "Le gusta el café de especialidad",
      facts: { ciudad: "CDMX" },
      updated_at: "2026-11-20T08:00:00.000Z",
    }),
  );
  await must(
    "llamada resumida A",
    db.from("calls").insert({
      id: randomUUID(),
      tenant_id: tenantA,
      conversation_id: conversationA,
      started_at: "2026-11-26T10:00:00.000Z",
      summary: "Reservó una mesa ayer",
    }),
  );
  await must(
    "llamada resumida B",
    db.from("calls").insert({
      id: randomUUID(),
      tenant_id: tenantB,
      conversation_id: conversationB,
      started_at: "2026-11-26T11:00:00.000Z",
      summary: "Reserva privada del otro negocio",
    }),
  );

  for (const [conversation, wamid, tenant] of [
    [conversationA, inboundA, tenantA],
    [conversationB, inboundB, tenantB],
    [conversationA, inboundThreshold, tenantA],
  ]) {
    await must(
      "mensaje entrante",
      db.from("messages").insert({
        tenant_id: tenant,
        conversation_id: conversation,
        direction: "inbound",
        kind: "text",
        body: "¿Sigue disponible la mesa?",
        wamid,
        occurred_at: "2026-11-27T11:00:00.000Z",
      }),
    );
  }

  await must(
    "8 mensajes nuevos",
    db.from("messages").insert(
      Array.from({ length: 8 }, (_, index) => ({
        tenant_id: tenantA,
        conversation_id: conversationA,
        direction: "inbound",
        kind: "text",
        body: `Mensaje nuevo ${index}`,
        wamid: `wamid.S22-N-${randomUUID()}`,
        occurred_at: "2026-11-27T11:05:00.000Z",
      })),
    ),
  );
}

const makeUseCase = (onSchedule?: (request: ConversationSummaryRequest) => void) => {
  const store = new SupabaseAssistantStore(db);
  const textMemory = new SupabaseTextMemoryReader(db);
  return new ReplyToInboundMessage({
    inbound: store,
    business: new BusinessContextReaderAdapter(composeBusinessContextForService()),
    history: store,
    llm: replyLlm,
    sender,
    messages: store,
    events: store,
    memory: textMemory,
    recentCalls: textMemory,
    newMessages: textMemory,
    summaryScheduler: {
      schedule: (request) => onSchedule?.(request),
    },
  });
};

describe("S22 · memoria compartida texto/voz (Supabase local)", () => {
  beforeAll(seed);

  afterAll(async () => {
    for (const tenant of [tenantA, tenantB]) {
      await db.from("webhook_events").delete().eq("tenant_id", tenant);
      await db.from("messages").delete().eq("tenant_id", tenant);
      await db.from("call_turns").delete().eq("tenant_id", tenant);
      await db.from("calls").delete().eq("tenant_id", tenant);
      await db.from("contact_memory").delete().eq("tenant_id", tenant);
      await db.from("conversations").delete().eq("tenant_id", tenant);
      await db.from("contacts").delete().eq("tenant_id", tenant);
      await db.from("assistant_configs").delete().eq("tenant_id", tenant);
      await db.from("business_profiles").delete().eq("tenant_id", tenant);
      await db.from("tenants").delete().eq("id", tenant);
    }
  });

  it("el texto posterior recibe la memoria de la llamada, sin filtrar otro tenant", async () => {
    expect(await makeUseCase().execute(tenantA, conversationA, inboundA)).toMatchObject({
      status: "sent",
    });
    const systemA = replyLlm.systems.at(-1)!;
    expect(systemA).toContain("Le gusta el café de especialidad");
    expect(systemA).toContain("CDMX");
    expect(systemA).toContain("Reservó una mesa ayer");
    expect(systemA).not.toContain("Reserva privada del otro negocio");

    expect(await makeUseCase().execute(tenantB, conversationB, inboundB)).toMatchObject({
      status: "sent",
    });
    const systemB = replyLlm.systems.at(-1)!;
    expect(systemB).not.toContain("Le gusta el café de especialidad");
    expect(systemB).not.toContain("Reservó una mesa ayer");

    const reader = new SupabaseTextMemoryReader(db);
    expect(await reader.read(tenantB, contactA)).toEqual({
      summary: "",
      facts: {},
      updatedAt: null,
    });
  });

  it("8 mensajes nuevos actualizan contact_memory y respetan el tenant", async () => {
    const scheduled: ConversationSummaryRequest[] = [];
    const pending: Promise<unknown>[] = [];
    const repository = new SupabaseCallMemoryRepository(db);
    const useCase = makeUseCase((request) => {
      scheduled.push(request);
      pending.push(
        new SummarizeConversation(repository, summaryLlm).execute(
          request.tenantId,
          request.contactId,
          request.turns,
        ),
      );
    });
    expect(await useCase.execute(tenantA, conversationA, inboundThreshold)).toMatchObject({
      status: "sent",
    });
    await Promise.all(pending);
    expect(scheduled).toHaveLength(1);

    const { data: memory, error } = await db
      .from("contact_memory")
      .select("summary, facts")
      .eq("tenant_id", tenantA)
      .eq("contact_id", contactA)
      .single();
    expect(error).toBeNull();
    expect(memory!.summary).toContain("Confirmó la reserva para mañana");
    expect(memory!.facts).toEqual({ ciudad: "CDMX", mesa: "2" });

    const other = await repository.readContactMemory(tenantB, contactB);
    expect(other).toEqual({ summary: "", facts: {} });
  });
});
