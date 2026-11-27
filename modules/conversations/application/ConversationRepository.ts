import type { CallDetail } from "../domain/CallDetail";
import type { Contact } from "../domain/Contact";
import type { Conversation } from "../domain/Conversation";
import type { ContactRequest } from "../domain/Request";
import type { CallEntry, MessageEntry, TimelineEntry } from "../domain/Timeline";
import type { CursorPageOptions, CursorPageResult } from "./pagination";

export type TimelineFilter = "all" | "messages" | "calls";

/** Conversación lista para la bandeja: contacto, último mensaje y actividad reciente. */
export interface ConversationSummary {
  readonly conversation: Conversation;
  readonly contact: Contact;
  readonly lastMessage: MessageEntry | null;
  /** Solicitud más reciente del contacto; define el estado visible del chat. */
  readonly latestRequest: ContactRequest | null;
}

/** Puerto del módulo: la aplicación no conoce Supabase ni la UI. */
export interface ConversationRepository {
  /** Página de conversaciones ordenada por (last_activity_at, id) descendente. */
  listConversations(
    tenantId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<ConversationSummary>>;
  /** Conversación puntual: permite abrir un enlace fuera de la primera página. */
  getConversation(tenantId: string, conversationId: string): Promise<ConversationSummary | null>;
  /** Mensajes de una conversación, del más reciente al más antiguo al paginar. */
  listMessages(
    tenantId: string,
    conversationId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<MessageEntry>>;
  /** Llamadas de una conversación en orden ascendente. */
  listCalls(tenantId: string, conversationId: string): Promise<CallEntry[]>;
  /** Reporte y transcripción de una llamada, o `null` si no es del tenant. */
  getCallDetail(tenantId: string, callId: string): Promise<CallDetail | null>;
  /** Solicitudes de los contactos indicados, de la más reciente a la más antigua. */
  listRequests(tenantId: string, contactIds: readonly string[]): Promise<ContactRequest[]>;
  getTimeline(
    tenantId: string,
    conversationId: string,
    filter: TimelineFilter,
  ): Promise<TimelineEntry[]>;
}
