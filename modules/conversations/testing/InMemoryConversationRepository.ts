import type { Contact } from "../domain/Contact";
import type { ConversationSummary } from "../application/ConversationRepository";
import type { ConversationRepository, TimelineFilter } from "../application/ConversationRepository";
import type { TimelineEntry } from "../domain/Timeline";

/** Repositorio falso en memoria; permite probar los casos de uso sin red ni base de datos. */
export class InMemoryConversationRepository implements ConversationRepository {
  private readonly summaries: ConversationSummary[] = [];
  private readonly entries: TimelineEntry[] = [];

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
    });
  }

  addEntry(entry: TimelineEntry): void {
    this.entries.push(entry);
  }

  async listConversations(tenantId: string): Promise<ConversationSummary[]> {
    return this.summaries.filter((summary) => summary.conversation.tenantId === tenantId);
  }

  async getTimeline(
    tenantId: string,
    conversationId: string,
    filter: TimelineFilter,
  ): Promise<TimelineEntry[]> {
    return this.entries.filter((entry) => {
      const inConversation = entry.conversationId === conversationId;
      const inTenant = this.summaries.some(
        (summary) =>
          summary.conversation.id === conversationId && summary.conversation.tenantId === tenantId,
      );
      const matchesFilter = filter === "all" || entry.type === filterToEntryType(filter);
      return inConversation && inTenant && matchesFilter;
    });
  }
}

function filterToEntryType(filter: Exclude<TimelineFilter, "all">): TimelineEntry["type"] {
  return filter === "messages" ? "message" : "call";
}
