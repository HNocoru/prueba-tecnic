import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/shared/db";
import { EndCall } from "@/modules/calls/application/EndCall";
import type { ScheduleCallSummary } from "@/modules/calls/application/ports";
import { SupabaseCallRepository } from "@/modules/calls/infrastructure/SupabaseCallRepository";
import { SupabaseCallMemoryRepository } from "@/modules/memory/infrastructure/SupabaseCallMemoryRepository";
import { SummarizeCall } from "@/modules/memory/application/SummarizeCall";
import type { ContactMemory } from "@/modules/memory/domain/ContactMemory";
import type { SummaryLlmPort } from "@/modules/memory/application/ports";

const URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient<Database>(URL, SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tenantA = randomUUID();
const tenantB = randomUUID();
const contactA = randomUUID();
const callId = randomUUID();
const waId = `52155${Date.now()}`;

const llm: SummaryLlmPort = {
  generateSummary: async () =>
    JSON.stringify({ summary: "El cliente pidió una cita en CDMX", facts: { ciudad: "CDMX" } }),
};

const gateway = {
  accept: async () => {},
  disconnect: async () => {},
};

async function seed(): Promise<void> {
  for (const [tenant, slug] of [
    [tenantA, `it-mem-a-${waId}`],
    [tenantB, `it-mem-b-${waId}`],
  ]) {
    const { error } = await db.from("tenants").insert({ id: tenant, slug, name: "Integration" });
    expect(error).toBeNull();
  }
  const { error: contactError } = await db
    .from("contacts")
    .insert({ id: contactA, tenant_id: tenantA, wa_id: waId });
  expect(contactError).toBeNull();

  const { data: conversation, error: conversationError } = await db
    .from("conversations")
    .insert({ tenant_id: tenantA, contact_id: contactA })
    .select("id")
    .single();
  expect(conversationError).toBeNull();

  const { error: callError } = await db.from("calls").insert({
    id: callId,
    tenant_id: tenantA,
    conversation_id: conversation!.id,
    started_at: "2026-11-27T10:00:00.000Z",
  });
  expect(callError).toBeNull();

  const { error: turnsError } = await db.from("call_turns").insert([
    { tenant_id: tenantA, call_id: callId, position: 1, role: "user", text: "Quiero una cita" },
    { tenant_id: tenantA, call_id: callId, position: 2, role: "assistant", text: "¿En CDMX?" },
  ]);
  expect(turnsError).toBeNull();
}

describe("S19 · memoria al cerrar una llamada (Supabase local)", () => {
  beforeAll(seed);

  afterAll(async () => {
    for (const tenant of [tenantA, tenantB]) {
      await db.from("call_turns").delete().eq("tenant_id", tenant);
      await db.from("contact_memory").delete().eq("tenant_id", tenant);
      await db.from("calls").delete().eq("tenant_id", tenant);
      await db.from("conversations").delete().eq("tenant_id", tenant);
      await db.from("contacts").delete().eq("tenant_id", tenant);
      await db.from("tenants").delete().eq("id", tenant);
    }
  });

  it("end guarda el resumen y la memoria del contacto, y un segundo end no lo pisa", async () => {
    const memoryRepository = new SupabaseCallMemoryRepository(db);
    let scheduled = 0;
    const pending: Promise<unknown>[] = [];
    const scheduler: ScheduleCallSummary = {
      schedule(tenantId, callIdToSummarize) {
        scheduled += 1;
        pending.push(new SummarizeCall(memoryRepository, llm).execute(tenantId, callIdToSummarize));
      },
    };
    const endCall = new EndCall(new SupabaseCallRepository(db), gateway, scheduler);
    const body = {
      ended_reason: "completed",
      answered_at: "2026-11-27T10:00:02.000Z",
      ended_at: "2026-11-27T10:01:00.000Z",
      duration_sec: 58,
      error: null,
    };

    expect(await endCall.execute(callId, body)).toEqual({ ok: true });
    await Promise.all(pending);
    expect(await endCall.execute(callId, body)).toEqual({ ok: true });
    expect(scheduled).toBe(1);

    const { data: call, error: callError } = await db
      .from("calls")
      .select("summary")
      .eq("id", callId)
      .single();
    expect(callError).toBeNull();
    expect(call!.summary).toBe("El cliente pidió una cita en CDMX");

    const { data: memory, error: memoryError } = await db
      .from("contact_memory")
      .select("summary, facts")
      .eq("tenant_id", tenantA)
      .eq("contact_id", contactA)
      .single();
    expect(memoryError).toBeNull();
    expect(memory!.facts).toEqual({ ciudad: "CDMX" });
    expect(memory!.summary).toBe("El cliente pidió una cita en CDMX");
  });

  it("GetCallContext devuelve la memoria del contacto de la llamada", async () => {
    const memoryRepository = new SupabaseCallMemoryRepository(db);
    const expected: ContactMemory = {
      summary: "El cliente pidió una cita en CDMX",
      facts: { ciudad: "CDMX" },
    };
    expect(await memoryRepository.readForCall(tenantA, callId)).toEqual(expected);
    expect(await memoryRepository.readForCall(tenantB, callId)).toEqual({ summary: "", facts: {} });
    expect(await memoryRepository.readContactMemory(tenantB, contactA)).toEqual({
      summary: "",
      facts: {},
    });
  });
});
