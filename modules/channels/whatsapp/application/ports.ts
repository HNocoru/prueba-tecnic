import type { InboundMessage } from "../domain/InboundMessage";

export type MessageInput = Pick<InboundMessage, "wamid" | "kind" | "body" | "occurredAt"> & {
  direction: "inbound";
};

/** Bitácora idempotente de eventos (webhook_events). */
export interface EventStore {
  /** Inserta el evento si no existe; informa si ya estaba procesado. */
  saveEvent(eventId: string, payload: unknown): Promise<{ alreadyProcessed: boolean }>;
  markProcessed(eventId: string, tenantId: string | null): Promise<void>;
  markFailed(eventId: string, tenantId: string | null, error: string): Promise<void>;
}

export interface TenantResolver {
  findTenantIdByPhoneNumberId(phoneNumberId: string): Promise<string | null>;
}

/** Escritura de contactos, conversaciones y mensajes; siempre con tenant_id explícito. */
export interface ContactStore {
  upsertContact(
    tenantId: string,
    contact: { waId: string; phoneE164: string | null; name: string | null },
  ): Promise<string>;
  upsertConversation(tenantId: string, contactId: string, lastActivityAt: Date): Promise<string>;
  /** Devuelve false si el wamid ya existía (ON CONFLICT DO NOTHING). */
  insertMessageIfNew(
    tenantId: string,
    conversationId: string,
    message: MessageInput,
  ): Promise<boolean>;
}
