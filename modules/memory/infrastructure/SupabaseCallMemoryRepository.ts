import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/shared/db";

import type { ContactMemory } from "../domain/ContactMemory";
import { EMPTY_MEMORY } from "../domain/ContactMemory";
import type {
  CallMemoryRepository,
  SummarizableCall,
  CallTurnForSummary,
} from "../application/ports";

const memorySchema = z.object({
  summary: z.string(),
  facts: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

/**
 * service_role con tenant_id explícito en cada consulta: la RLS no decide qué tenant se lee,
 * lo decide el identificador ya resuelto por la capa superior.
 */
export class SupabaseCallMemoryRepository implements CallMemoryRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async loadCallForSummary(tenantId: string, callId: string): Promise<SummarizableCall | null> {
    const { data: call, error: callError } = await this.db
      .from("calls")
      .select("conversation_id, summary")
      .eq("tenant_id", tenantId)
      .eq("id", callId)
      .maybeSingle();
    if (callError) throw new Error(`No se pudo leer la llamada: ${callError.message}`);
    if (!call) return null;

    const [conversation, turns] = await Promise.all([
      this.db
        .from("conversations")
        .select("contact_id")
        .eq("tenant_id", tenantId)
        .eq("id", call.conversation_id)
        .maybeSingle(),
      this.db
        .from("call_turns")
        .select("role, text")
        .eq("tenant_id", tenantId)
        .eq("call_id", callId)
        .order("position", { ascending: true }),
    ]);
    if (conversation.error)
      throw new Error(`No se pudo leer la conversación: ${conversation.error.message}`);
    if (turns.error) throw new Error(`No se pudieron leer los turnos: ${turns.error.message}`);
    if (!conversation.data) return null;

    const parsedTurns: CallTurnForSummary[] = (turns.data ?? []).map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      text: turn.text,
    }));
    return {
      contactId: conversation.data.contact_id,
      turns: parsedTurns,
      hasSummary: (call.summary ?? "").trim().length > 0,
    };
  }

  async saveCallSummary(tenantId: string, callId: string, summary: string): Promise<boolean> {
    // Condición en la propia UPDATE: dos ends en carrera no se pisan.
    const first = await this.db
      .from("calls")
      .update({ summary })
      .eq("tenant_id", tenantId)
      .eq("id", callId)
      .eq("summary", "")
      .select("id");
    if (first.error) throw new Error(`No se pudo guardar el resumen: ${first.error.message}`);
    if (first.data && first.data.length > 0) return true;

    const legacy = await this.db
      .from("calls")
      .update({ summary })
      .eq("tenant_id", tenantId)
      .eq("id", callId)
      .is("summary", null)
      .select("id");
    if (legacy.error) throw new Error(`No se pudo guardar el resumen: ${legacy.error.message}`);
    return (legacy.data?.length ?? 0) > 0;
  }

  async readContactMemory(tenantId: string, contactId: string): Promise<ContactMemory> {
    const { data, error } = await this.db
      .from("contact_memory")
      .select("summary, facts")
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer la memoria: ${error.message}`);
    if (!data) return EMPTY_MEMORY;
    const parsed = memorySchema.safeParse(data);
    return parsed.success ? parsed.data : EMPTY_MEMORY;
  }

  async readForCall(tenantId: string, callId: string): Promise<ContactMemory> {
    const { data: call, error } = await this.db
      .from("calls")
      .select("conversation_id")
      .eq("tenant_id", tenantId)
      .eq("id", callId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer la llamada: ${error.message}`);
    if (!call) return EMPTY_MEMORY;

    const conversation = await this.db
      .from("conversations")
      .select("contact_id")
      .eq("tenant_id", tenantId)
      .eq("id", call.conversation_id)
      .maybeSingle();
    if (conversation.error)
      throw new Error(`No se pudo leer la conversación: ${conversation.error.message}`);
    if (!conversation.data) return EMPTY_MEMORY;
    return this.readContactMemory(tenantId, conversation.data.contact_id);
  }

  async saveContactMemory(
    tenantId: string,
    contactId: string,
    memory: ContactMemory,
  ): Promise<void> {
    const { error } = await this.db.from("contact_memory").upsert(
      {
        tenant_id: tenantId,
        contact_id: contactId,
        summary: memory.summary,
        facts: memory.facts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,contact_id" },
    );
    if (error) throw new Error(`No se pudo guardar la memoria: ${error.message}`);
  }
}
