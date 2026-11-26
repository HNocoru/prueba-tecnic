/**
 * API publica del modulo conversations.
 * La capa app solo importa desde este index: los casos de uso y entidades publicos.
 */
export { Contact } from "./domain/Contact";
export type { ContactRepository } from "./application/ContactRepository";
export { ListContacts } from "./application/ListContacts";
export type { Conversation } from "./domain/Conversation";
export type {
  CallEntry,
  CallOutcome,
  Direction,
  MessageEntry,
  MessageKind,
  TimelineEntry,
} from "./domain/Timeline";
export type {
  ConversationRepository,
  ConversationSummary,
  TimelineFilter,
} from "./application/ConversationRepository";
export { ListConversations } from "./application/ListConversations";
export { GetTimeline } from "./application/GetTimeline";
