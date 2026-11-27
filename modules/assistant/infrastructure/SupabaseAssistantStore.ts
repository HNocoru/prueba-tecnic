import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/db";
import type {
  ConversationHistoryReader,
  InboundMessageReader,
  MessageWriter,
  ReplyEventStore,
} from "../application/ports";
import type { ConversationTurn } from "../domain/ConversationTurn";
import type { MessageDirection, MessageKind, StoredInboundMessage } from "../domain/Reply";

const PROVIDER = "assistant";
const replyEventId = (inboundMessageId: string) => `reply:${inboundMessageId}`;

/** Adaptador service_role: cada consulta lleva tenant_id explícito. */
export class SupabaseAssistantStore
  implements InboundMessageReader, ConversationHistoryReader, MessageWriter, ReplyEventStore
{
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findInbound(
    tenantId: string,
    inboundMessageId: string,
  ): Promise<StoredInboundMessage | null> {
    const { data, error } = await this.db
      .from("messages")
      .select("id,direction,kind,body,conversation_id")
      .eq("tenant_id", tenantId)
      .eq("wamid", inboundMessageId)
      .eq("direction", "inbound")
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer el mensaje: ${error.message}`);
    if (!data) return null;

    const { data: conversation, error: conversationError } = await this.db
      .from("conversations")
      .select("contact_id")
      .eq("tenant_id", tenantId)
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (conversationError)
      throw new Error(`No se pudo leer la conversación: ${conversationError.message}`);
    if (!conversation) throw new Error("conversación del mensaje no encontrada");

    const { data: contact, error: contactError } = await this.db
      .from("contacts")
      .select("wa_id,phone_e164")
      .eq("tenant_id", tenantId)
      .eq("id", conversation.contact_id)
      .maybeSingle();
    if (contactError) throw new Error(`No se pudo leer el contacto: ${contactError.message}`);
    if (!contact) throw new Error("contacto del mensaje no encontrado");

    return {
      id: data.id,
      direction: data.direction as MessageDirection,
      kind: data.kind as MessageKind,
      body: data.body,
      waId: contact.wa_id,
      phoneE164: contact.phone_e164,
      contactId: conversation.contact_id,
    };
  }

  async findPhoneNumberId(tenantId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("whatsapp_numbers")
      .select("phone_number_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer el número: ${error.message}`);
    return data?.phone_number_id ?? null;
  }

  async loadHistory(
    tenantId: string,
    conversationId: string,
    limit: number,
  ): Promise<ConversationTurn[]> {
    const { data, error } = await this.db
      .from("messages")
      .select("body,direction")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .eq("kind", "text")
      .in("direction", ["inbound", "outbound"])
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`No se pudo leer el historial: ${error.message}`);

    return (data ?? []).reverse().map((row) => ({
      role: row.direction === "outbound" ? ("assistant" as const) : ("user" as const),
      body: row.body ?? "",
    }));
  }

  async countRecentOutbound(
    tenantId: string,
    conversationId: string,
    since: Date,
  ): Promise<number> {
    const { count, error } = await this.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .gte("occurred_at", since.toISOString());
    if (error) throw new Error(`No se pudo contar las respuestas: ${error.message}`);
    return count ?? 0;
  }

  async insertOutbound(
    tenantId: string,
    conversationId: string,
    message: { body: string; wamid: string; occurredAt: Date },
  ): Promise<void> {
    const { error } = await this.db.from("messages").upsert(
      {
        tenant_id: tenantId,
        conversation_id: conversationId,
        direction: "outbound",
        kind: "text",
        body: message.body,
        wamid: message.wamid,
        occurred_at: message.occurredAt.toISOString(),
      },
      { onConflict: "wamid", ignoreDuplicates: true },
    );
    if (error) throw new Error(`No se pudo guardar la respuesta: ${error.message}`);
  }

  async tryClaim(tenantId: string, inboundMessageId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("webhook_events")
      .upsert(
        {
          provider: PROVIDER,
          event_id: replyEventId(inboundMessageId),
          tenant_id: tenantId,
          payload: {} as NonNullable<Json>,
        },
        { onConflict: "provider,event_id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw new Error(`No se pudo reclamar la respuesta: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  async markFailed(tenantId: string, inboundMessageId: string, error: string): Promise<void> {
    const { error: updateError } = await this.db
      .from("webhook_events")
      .update({ tenant_id: tenantId, error })
      .eq("provider", PROVIDER)
      .eq("event_id", replyEventId(inboundMessageId));
    if (updateError) throw new Error(`No se pudo registrar el fallo: ${updateError.message}`);
  }

  async markProcessed(tenantId: string, inboundMessageId: string): Promise<void> {
    const { error } = await this.db
      .from("webhook_events")
      .update({
        tenant_id: tenantId,
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq("provider", PROVIDER)
      .eq("event_id", replyEventId(inboundMessageId));
    if (error) throw new Error(`No se pudo marcar la respuesta: ${error.message}`);
  }
}
