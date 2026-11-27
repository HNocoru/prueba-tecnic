import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/shared/db";

import type {
  ConversationRepository,
  ConversationSummary,
  TimelineFilter,
} from "../application/ConversationRepository";
import type { CursorPageOptions, CursorPageResult, PageCursor } from "../application/pagination";
import type { CallDetail, CallTurn, CallTurnRole } from "../domain/CallDetail";
import { Contact } from "../domain/Contact";
import type { ContactRequest, RequestSource, RequestStatus } from "../domain/Request";
import { REQUEST_SOURCES, REQUEST_STATUSES, latestRequest } from "../domain/Request";
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
type RequestRow = Tables<"requests">;
type TurnRow = Tables<"call_turns">;

const DIRECTIONS: readonly Direction[] = ["inbound", "outbound"];
const MESSAGE_KINDS: readonly MessageKind[] = ["text", "audio", "image", "document"];
const CALL_OUTCOMES: readonly NonNullable<CallOutcome>[] = [
  "completed",
  "caller_hangup",
  "time_limit",
  "failed",
  "missed",
];

/** Filtro keyset de PostgREST para orden descendente por (columna, id). */
function afterFilter(column: string, cursor: PageCursor): string {
  return `${column}.lt."${cursor.at}",and(${column}.eq."${cursor.at}",id.lt."${cursor.id}")`;
}

/**
 * Adaptador de Supabase para conversaciones y línea de tiempo.
 * Recibe el cliente de sesión del usuario (nunca service role): la RLS limita
 * cada consulta a los tenants de current_tenant().
 */
export class SupabaseConversationRepository implements ConversationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listConversations(
    tenantId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<ConversationSummary>> {
    // Una sola consulta acotada: la página de conversaciones, su contacto (embed
    // por FK compuesta) y solo el último mensaje de cada una (limit 1 por padre).
    // Se pide un registro extra para saber si hay página siguiente.
    let query = this.supabase
      .from("conversations")
      .select("*, contacts(*), messages(*)")
      .eq("tenant_id", tenantId);

    if (options.after) {
      query = query.or(afterFilter("last_activity_at", options.after));
    }

    const { data, error } = await query
      .order("last_activity_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(options.limit + 1)
      .order("occurred_at", { ascending: false, referencedTable: "messages" })
      .limit(1, { referencedTable: "messages" });

    if (error) {
      throw new Error("No se pudieron listar las conversaciones del tenant");
    }

    const rows = data ?? [];
    const page = rows.slice(0, options.limit);
    // Una segunda consulta acotada a los contactos de la página enriquece el
    // estado del chat sin repetir una consulta por fila (evita N+1).
    const requests = await this.listRequests(
      tenantId,
      page.map((row) => row.contact_id),
    );

    return {
      items: page.map((row) => this.toSummary(row, requests)),
      hasMore: rows.length > options.limit,
    };
  }

  async getConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationSummary | null> {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("*, contacts(*), messages(*)")
      .eq("tenant_id", tenantId)
      .eq("id", conversationId)
      .order("occurred_at", { ascending: false, referencedTable: "messages" })
      .limit(1, { referencedTable: "messages" })
      .maybeSingle();

    if (error) {
      throw new Error("No se pudo obtener la conversación");
    }
    if (!data) {
      return null;
    }

    const requests = await this.listRequests(tenantId, [data.contact_id]);
    return this.toSummary(data, requests);
  }

  async listMessages(
    tenantId: string,
    conversationId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<MessageEntry>> {
    let query = this.supabase
      .from("messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId);

    if (options.after) {
      query = query.or(afterFilter("occurred_at", options.after));
    }

    const { data, error } = await query
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(options.limit + 1);

    if (error) {
      throw new Error("No se pudieron listar los mensajes de la conversación");
    }

    const rows = data ?? [];
    const page = rows.slice(0, options.limit);

    return {
      // La consulta fue descendente para traer los más recientes; la UI los pinta
      // de antiguo a nuevo y prepende las páginas anteriores.
      items: page.reverse().map((row) => this.toMessage(row)),
      hasMore: rows.length > options.limit,
    };
  }

  async listCalls(tenantId: string, conversationId: string): Promise<CallEntry[]> {
    const { data, error } = await this.supabase
      .from("calls")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error("No se pudieron listar las llamadas de la conversación");
    }

    return (data ?? []).map((row) => this.toCall(row));
  }

  async getCallDetail(tenantId: string, callId: string): Promise<CallDetail | null> {
    const { data, error } = await this.supabase
      .from("calls")
      .select("*, call_turns(*)")
      .eq("tenant_id", tenantId)
      .eq("id", callId)
      .order("position", { ascending: true, referencedTable: "call_turns" })
      .maybeSingle();

    if (error) {
      throw new Error("No se pudo obtener el detalle de la llamada");
    }
    if (!data) {
      return null;
    }

    const row = data as CallRow & { call_turns: TurnRow[] };
    return {
      call: this.toCall(row),
      turns: (row.call_turns ?? []).map((turn) => this.toTurn(turn)),
    };
  }

  async listRequests(tenantId: string, contactIds: readonly string[]): Promise<ContactRequest[]> {
    if (contactIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("contact_id", [...contactIds])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw new Error("No se pudieron listar las solicitudes de los contactos");
    }

    return (data ?? []).map((row) => this.toRequest(row));
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

  private toSummary(
    row: Tables<"conversations"> & { contacts: ContactRow | null; messages: MessageRow[] },
    requests: readonly ContactRequest[],
  ): ConversationSummary {
    const contact = row.contacts;
    if (!contact) {
      throw new Error(`No se encontró el contacto ${row.contact_id} de la conversación ${row.id}`);
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
      latestRequest: latestRequest(
        requests.filter((request) => request.contactId === row.contact_id),
      ),
    };
  }

  private toRequest(row: RequestRow): ContactRequest {
    const rowWithAi = row as RequestRow & {
      conversation_id?: string | null;
      source?: string | null;
    };
    return {
      id: row.id,
      tenantId: row.tenant_id,
      contactId: row.contact_id,
      conversationId: rowWithAi.conversation_id ?? null,
      title: row.title,
      status: REQUEST_STATUSES.includes(row.status as RequestStatus)
        ? (row.status as RequestStatus)
        : "none",
      amount: row.amount,
      source: REQUEST_SOURCES.includes(rowWithAi.source as RequestSource)
        ? (rowWithAi.source as RequestSource)
        : "manual",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toTurn(row: TurnRow): CallTurn {
    const role: CallTurnRole = row.role === "assistant" ? "assistant" : "user";
    return {
      id: row.id,
      tenantId: row.tenant_id,
      callId: row.call_id,
      role,
      text: row.text,
      position: row.position,
    };
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
