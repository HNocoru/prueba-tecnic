import type { Contact } from "../domain/Contact";
import type { Conversation } from "../domain/Conversation";
import type { MessageEntry, TimelineEntry } from "../domain/Timeline";

export type TimelineFilter = "all" | "messages" | "calls";

/** Conversación lista para la bandeja: contacto, último mensaje y actividad reciente. */
export interface ConversationSummary {
  readonly conversation: Conversation;
  readonly contact: Contact;
  readonly lastMessage: MessageEntry | null;
}

/** Puerto del módulo: la aplicación no conoce Supabase ni la UI. */
export interface ConversationRepository {
  listConversations(tenantId: string): Promise<ConversationSummary[]>;
  getTimeline(
    tenantId: string,
    conversationId: string,
    filter: TimelineFilter,
  ): Promise<TimelineEntry[]>;
}
