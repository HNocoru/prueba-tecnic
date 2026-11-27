/**
 * API publica del modulo conversations.
 * La capa app solo importa desde este index: los casos de uso y entidades publicos.
 */
export type { CallDetail, CallTurn, CallTurnRole } from "./domain/CallDetail";
export { Contact } from "./domain/Contact";
export type { ContactRepository } from "./application/ContactRepository";
export { ListContacts } from "./application/ListContacts";
export { REQUEST_STATUSES } from "./domain/Request";
export type { ContactRequest, RequestStatus } from "./domain/Request";
export { GetCallDetail } from "./application/GetCallDetail";
export { ListContactRequests } from "./application/ListContactRequests";
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
export { ListCalls } from "./application/ListCalls";
export { ListConversations } from "./application/ListConversations";
export { GetConversation } from "./application/GetConversation";
export { GetTimeline } from "./application/GetTimeline";
export { ListMessages } from "./application/ListMessages";
export {
  DEFAULT_PAGE_SIZE,
  InvalidCursorError,
  MESSAGE_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
} from "./application/pagination";
export type { CursorPageRequest, Page } from "./application/pagination";
