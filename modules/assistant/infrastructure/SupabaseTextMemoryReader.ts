import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/shared/db";

import type {
  ContactMemoryReader,
  ContactMemorySnapshot,
  NewMessageCounter,
  RecentCallSummariesReader,
  RecentCallSummary,
} from "../application/ports";

const factsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

/**
 * service_role con tenant_id y contact_id explícitos: ni el tenant ni el contacto se toman
 * del texto entrante. Un único adaptador sirve para memoria, llamadas recientes y conteo.
 */
export class SupabaseTextMemoryReader
  implements ContactMemoryReader, RecentCallSummariesReader, NewMessageCounter
{
  constructor(private readonly db: SupabaseClient<Database>) {}

  async read(tenantId: string, contactId: string): Promise<ContactMemorySnapshot> {
    const { data, error } = await this.db
      .from("contact_memory")
      .select("summary, facts, updated_at")
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer la memoria del texto: ${error.message}`);
    if (!data) return { summary: "", facts: {}, updatedAt: null };

    const parsed = factsSchema.safeParse(data.facts);
    return {
      summary: data.summary,
      facts: parsed.success ? parsed.data : {},
      updatedAt: data.updated_at,
    };
  }

  async readRecent(
    tenantId: string,
    contactId: string,
    limit: number,
  ): Promise<RecentCallSummary[]> {
    const ids = await this.conversationIds(tenantId, contactId);
    if (ids.length === 0) return [];

    const { data, error } = await this.db
      .from("calls")
      .select("summary, started_at, ended_at")
      .eq("tenant_id", tenantId)
      .in("conversation_id", ids)
      .not("summary", "is", null)
      .neq("summary", "")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`No se pudieron leer las llamadas recientes: ${error.message}`);
    return (data ?? []).map((call) => ({
      at: call.ended_at ?? call.started_at,
      summary: call.summary ?? "",
    }));
  }

  async countInboundSince(tenantId: string, contactId: string, since: Date): Promise<number> {
    const ids = await this.conversationIds(tenantId, contactId);
    if (ids.length === 0) return 0;

    const { count, error } = await this.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("conversation_id", ids)
      .eq("direction", "inbound")
      .eq("kind", "text")
      .gte("occurred_at", since.toISOString());
    if (error) throw new Error(`No se pudieron contar los mensajes: ${error.message}`);
    return count ?? 0;
  }

  private async conversationIds(tenantId: string, contactId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from("conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId);
    if (error) throw new Error(`No se pudo leer la conversación: ${error.message}`);
    return (data ?? []).map((row) => row.id);
  }
}
