import type { CallDetail, CallTurn } from "../domain/CallDetail";
import type { Contact } from "../domain/Contact";
import type { ContactRequest } from "../domain/Request";
import { latestRequest } from "../domain/Request";
import type { MessageEntry, TimelineEntry, CallEntry } from "../domain/Timeline";
import type { ContactRepository } from "../application/ContactRepository";
import type { ConversationSummary } from "../application/ConversationRepository";
import type { ConversationRepository, TimelineFilter } from "../application/ConversationRepository";
import {
  isAfterCursor,
  type CursorPageOptions,
  type CursorPageResult,
} from "../application/pagination";

/** Repositorio falso en memoria; permite probar los casos de uso sin red ni base de datos. */
export class InMemoryConversationRepository implements ConversationRepository {
  private readonly summaries: ConversationSummary[] = [];
  private readonly entries: TimelineEntry[] = [];
  private readonly requests: ContactRequest[] = [];
  private readonly turns: CallTurn[] = [];

  addSummary(summary: ConversationSummary): void {
    this.summaries.push(summary);
  }

  addContact(contact: Contact, conversationId = `conversation-${this.summaries.length}`): void {
    this.summaries.push({
      conversation: {
        id: conversationId,
        tenantId: contact.tenantId,
        contactId: contact.id,
        lastActivityAt: contact.createdAt,
      },
      contact,
      lastMessage: null,
      latestRequest: null,
    });
  }

  addEntry(entry: TimelineEntry): void {
    this.entries.push(entry);
  }

  addRequest(request: ContactRequest): void {
    this.requests.push(request);
  }

  addTurn(turn: CallTurn): void {
    this.turns.push(turn);
  }

  async listConversations(
    tenantId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<ConversationSummary>> {
    const ordered = this.summaries
      .filter((summary) => summary.conversation.tenantId === tenantId)
      .map((summary) => ({
        ...summary,
        latestRequest: latestRequest(
          this.requests.filter(
            (request) => request.tenantId === tenantId && request.contactId === summary.contact.id,
          ),
        ),
      }))
      .sort(compareConversations)
      .filter(
        (summary) =>
          !options.after ||
          isAfterCursor(
            summary.conversation.lastActivityAt,
            summary.conversation.id,
            options.after,
          ),
      );

    return {
      items: ordered.slice(0, options.limit),
      hasMore: ordered.length > options.limit,
    };
  }

  async getConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationSummary | null> {
    const summary =
      this.summaries.find(
        (item) =>
          item.conversation.id === conversationId && item.conversation.tenantId === tenantId,
      ) ?? null;

    return summary
      ? {
          ...summary,
          latestRequest: latestRequest(
            this.requests.filter(
              (request) =>
                request.tenantId === tenantId && request.contactId === summary.contact.id,
            ),
          ),
        }
      : null;
  }

  async listMessages(
    tenantId: string,
    conversationId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<MessageEntry>> {
    const messages = this.entries
      .filter(
        (entry): entry is MessageEntry =>
          entry.type === "message" &&
          entry.conversationId === conversationId &&
          this.belongsToTenant(tenantId, conversationId),
      )
      .sort(compareEntriesAscending)
      .filter((entry) => !options.after || isAfterCursor(entry.at, entry.id, options.after));

    // El cursor marca el mensaje más antiguo ya cargado: esta página trae los
    // `limit` mensajes inmediatamente anteriores y los devuelve en orden ascendente.
    const items = messages.slice(Math.max(messages.length - options.limit, 0));

    return { items, hasMore: messages.length > options.limit };
  }

  async listCalls(tenantId: string, conversationId: string): Promise<CallEntry[]> {
    return this.entries
      .filter(
        (entry): entry is CallEntry =>
          entry.type === "call" &&
          entry.conversationId === conversationId &&
          this.belongsToTenant(tenantId, conversationId),
      )
      .sort(compareEntriesAscending);
  }

  async getCallDetail(tenantId: string, callId: string): Promise<CallDetail | null> {
    const call = this.entries.find(
      (entry): entry is CallEntry =>
        entry.type === "call" &&
        entry.id === callId &&
        entry.conversationId !== "" &&
        this.belongsToTenant(tenantId, entry.conversationId),
    );
    if (!call) {
      return null;
    }

    return {
      call,
      turns: this.turns
        .filter((turn) => turn.tenantId === tenantId && turn.callId === callId)
        .sort((a, b) => a.position - b.position),
    };
  }

  async listRequests(tenantId: string, contactIds: readonly string[]): Promise<ContactRequest[]> {
    return this.requests
      .filter((request) => request.tenantId === tenantId && contactIds.includes(request.contactId))
      .sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
          return a.createdAt < b.createdAt ? 1 : -1;
        }
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
  }

  async getTimeline(
    tenantId: string,
    conversationId: string,
    filter: TimelineFilter,
  ): Promise<TimelineEntry[]> {
    return this.entries
      .filter((entry) => {
        const inConversation = entry.conversationId === conversationId;
        const inTenant = this.belongsToTenant(tenantId, conversationId);
        const matchesFilter = filter === "all" || entry.type === filterToEntryType(filter);
        return inConversation && inTenant && matchesFilter;
      })
      .sort(compareEntriesAscending);
  }

  private belongsToTenant(tenantId: string, conversationId: string): boolean {
    return this.summaries.some(
      (summary) =>
        summary.conversation.id === conversationId && summary.conversation.tenantId === tenantId,
    );
  }
}

/** Repositorio falso de contactos con la misma paginación por cursor que el adaptador real. */
export class InMemoryContactRepository implements ContactRepository {
  private readonly contacts: Contact[] = [];

  add(contact: Contact): void {
    this.contacts.push(contact);
  }

  async listContacts(
    tenantId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<Contact>> {
    const ordered = this.contacts
      .filter((contact) => contact.tenantId === tenantId)
      .sort((a, b) => compareDescending(a.createdAt, a.id, b.createdAt, b.id))
      .filter(
        (contact) => !options.after || isAfterCursor(contact.createdAt, contact.id, options.after),
      );

    return {
      items: ordered.slice(0, options.limit),
      hasMore: ordered.length > options.limit,
    };
  }
}

function compareConversations(a: ConversationSummary, b: ConversationSummary): number {
  return compareDescending(
    a.conversation.lastActivityAt,
    a.conversation.id,
    b.conversation.lastActivityAt,
    b.conversation.id,
  );
}

function compareDescending(aAt: string, aId: string, bAt: string, bId: string): number {
  if (aAt !== bAt) {
    return aAt < bAt ? 1 : -1;
  }
  return aId < bId ? 1 : aId > bId ? -1 : 0;
}

function compareEntriesAscending(a: TimelineEntry, b: TimelineEntry): number {
  if (a.at !== b.at) {
    return a.at < b.at ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function filterToEntryType(filter: Exclude<TimelineFilter, "all">): TimelineEntry["type"] {
  return filter === "messages" ? "message" : "call";
}
