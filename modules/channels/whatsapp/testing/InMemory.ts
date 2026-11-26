import type { ContactStore, EventStore, MessageInput, TenantResolver } from "../application/ports";

/** Repositorios en memoria que replican las restricciones únicas de la base. */
export class InMemoryChannelStore implements ContactStore, EventStore, TenantResolver {
  readonly events = new Map<
    string,
    { tenantId: string | null; payload: unknown; processed: boolean; error: string | null }
  >();
  readonly contacts = new Map<
    string,
    { id: string; tenantId: string; waId: string; phoneE164: string | null; name: string | null }
  >();
  readonly conversations = new Map<
    string,
    { id: string; tenantId: string; contactId: string; lastActivityAt: Date }
  >();
  readonly messages = new Map<
    string,
    MessageInput & { tenantId: string; conversationId: string }
  >();
  constructor(private readonly numbers: Record<string, string>) {}

  async findTenantIdByPhoneNumberId(id: string) {
    return this.numbers[id] ?? null;
  }
  async saveEvent(eventId: string, payload: unknown) {
    const existing = this.events.get(eventId);
    if (existing) return { alreadyProcessed: existing.processed };
    this.events.set(eventId, { tenantId: null, payload, processed: false, error: null });
    return { alreadyProcessed: false };
  }
  async markProcessed(eventId: string, tenantId: string | null) {
    const e = this.events.get(eventId)!;
    Object.assign(e, { tenantId, processed: true, error: null });
  }
  async markFailed(eventId: string, tenantId: string | null, error: string) {
    Object.assign(this.events.get(eventId)!, { tenantId, error });
  }
  async upsertContact(
    tenantId: string,
    c: { waId: string; phoneE164: string | null; name: string | null },
  ) {
    const key = `${tenantId}:${c.waId}`;
    const prev = this.contacts.get(key);
    const row = {
      id: prev?.id ?? `c${this.contacts.size + 1}`,
      tenantId,
      waId: c.waId,
      phoneE164: c.phoneE164 ?? prev?.phoneE164 ?? null,
      name: c.name ?? prev?.name ?? null,
    };
    this.contacts.set(key, row);
    return row.id;
  }
  async upsertConversation(tenantId: string, contactId: string, at: Date) {
    const key = `${tenantId}:${contactId}`;
    const prev = this.conversations.get(key);
    const row = {
      id: prev?.id ?? `v${this.conversations.size + 1}`,
      tenantId,
      contactId,
      lastActivityAt: at,
    };
    this.conversations.set(key, row);
    return row.id;
  }
  async insertMessageIfNew(tenantId: string, conversationId: string, m: MessageInput) {
    if (this.messages.has(m.wamid)) return false;
    this.messages.set(m.wamid, { ...m, tenantId, conversationId });
    return true;
  }
}
