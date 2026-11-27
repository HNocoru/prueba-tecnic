import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/shared/db";

import type {
  ConversationRepository,
  ConversationSummary,
  TimelineFilter,
} from "../application/ConversationRepository";
import { Contact } from "../domain/Contact";
import type {
  CallEntry,
  CallOutcome,
  Direction,
  MessageEntry,
  MessageKind,
  TimelineEntry,
} from "../domain/Timeline";

type ContactRow = Tables<"contacts">;
type MessageRow = Tables<"messages">;
type CallRow = Tables<"calls">;

/** Tope de conversaciones en la bandeja: las más recientes. */
const CONVERSATION_LIMIT = 50;

const DIRECTIONS: readonly Direction[] = ["inbound", "outbound"];
const MESSAGE_KINDS: readonly MessageKind[] = ["text", "audio", "image", "document"];
const CALL_OUTCOMES: readonly NonNullable<CallOutcome>[] = [
  "completed",
  "caller_hangup",
  "time_limit",
  "failed",
  "missed",
];

/**
 * Adaptador de Supabase para conversaciones y línea de tiempo.
 * Recibe el cliente de sesión del usuario (nunca service role): la RLS limita
 * cada consulta a los tenants de current_tenant().
 */
export class SupabaseConversationRepository implements ConversationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listConversations(tenantId: string): Promise<ConversationSummary[]> {
    // Una sola consulta acotada: las N conversaciones más recientes, su contacto
    // (join por FK compuesta) y solo el último mensaje de cada una (limit 1 por
    // padre, usa ix_messages_conversation_occurred). La RLS sigue aplicando.
    const { data, error } = await this.supabase
      .from("conversations")
      .select("*, contacts(*), messages(*)")
      .eq("tenant_id", tenantId)
      .order("last_activity_at", { ascending: false })
      .limit(CONVERSATION_LIMIT)
      .order("occurred_at", { ascending: false, referencedTable: "messages" })
      .limit(1, { referencedTable: "messages" });

    if (error) {
      throw new Error("No se pudieron listar las conversaciones del tenant");
    }

    return (data ?? []).map((row) => {
      const contact = row.contacts;
      if (!contact) {
        throw new Error(
          `No se encontró el contacto ${row.contact_id} de la conversación ${row.id}`,
        );
      }
      const last = row.messages[0];

      return {
        conversation: {
          id: row.id,
          tenantId: row.tenant_id,
          contactId: row.contact_id,
          lastActivityAt: row.last_activity_at,
        },
        contact: this.toContact(contact),
        lastMessage: last ? this.toMessage(last) : null,
      };
    });
  }

  async getTimeline(
    tenantId: string,
    conversationId: string,
    filter: TimelineFilter,
  ): Promise<TimelineEntry[]> {
    // Mensajes y llamadas son independientes: se piden en paralelo (sin cascada).
    const [messagesResult, callsResult] = await Promise.all([
      filter === "calls"
        ? null
        : this.supabase
            .from("messages")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("conversation_id", conversationId)
            .order("occurred_at", { ascending: true }),
      filter === "messages"
        ? null
        : this.supabase
            .from("calls")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("conversation_id", conversationId)
            .order("started_at", { ascending: true }),
    ]);

    if (messagesResult?.error) {
      throw new Error("No se pudieron listar los mensajes de la conversación");
    }
    if (callsResult?.error) {
      throw new Error("No se pudieron listar las llamadas de la conversación");
    }

    return [
      ...(messagesResult?.data ?? []).map((row) => this.toMessage(row)),
      ...(callsResult?.data ?? []).map((row) => this.toCall(row)),
    ];
  }

  private toContact(row: ContactRow): Contact {
    return new Contact({
      id: row.id,
      tenantId: row.tenant_id,
      waId: row.wa_id,
      phoneE164: row.phone_e164,
      name: row.name,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      redactedAt: row.redacted_at,
    });
  }

  private toMessage(row: MessageRow): MessageEntry {
    return {
      type: "message",
      id: row.id,
      conversationId: row.conversation_id,
      direction: DIRECTIONS.includes(row.direction as Direction)
        ? (row.direction as Direction)
        : "inbound",
      kind: MESSAGE_KINDS.includes(row.kind as MessageKind) ? (row.kind as MessageKind) : "text",
      body: row.body,
      mediaPath: row.media_path,
      transcript: row.transcript,
      at: row.occurred_at,
    };
  }

  private toCall(row: CallRow): CallEntry {
    return {
      type: "call",
      id: row.id,
      conversationId: row.conversation_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds,
      outcome: this.toOutcome(row.outcome),
      summary: row.summary,
      at: row.started_at,
    };
  }

  private toOutcome(value: string | null): CallOutcome {
    if (value === null) {
      return null;
    }
    return CALL_OUTCOMES.includes(value as NonNullable<CallOutcome>)
      ? (value as NonNullable<CallOutcome>)
      : "failed";
  }
}
