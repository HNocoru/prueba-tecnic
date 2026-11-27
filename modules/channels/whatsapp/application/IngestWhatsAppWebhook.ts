import { createHash } from "node:crypto";

import type { InboundCall } from "../domain/InboundCall";
import type { InboundMessage } from "../domain/InboundMessage";
import { parsePayload } from "./parsePayload";
import type {
  CallEventSink,
  ContactStore,
  EventStore,
  NewInboundMessage,
  TenantResolver,
} from "./ports";

const PROVIDER_ERROR_MAX = 500;

/**
 * Caso de uso: ingesta idempotente de un webhook de WhatsApp.
 * Nunca lanza: los fallos quedan en webhook_events.error para no provocar reintentos en cascada de Meta.
 */
export class IngestWhatsAppWebhook {
  constructor(
    private readonly events: EventStore,
    private readonly tenants: TenantResolver,
    private readonly contacts: ContactStore,
    private readonly calls?: CallEventSink,
  ) {}

  async execute(rawBody: string): Promise<NewInboundMessage[]> {
    const created: NewInboundMessage[] = [];
    const bodyHash = `body:${createHash("sha256").update(rawBody).digest("hex")}`;

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      await this.recordFailure(bodyHash, { raw: rawBody.slice(0, 2000) }, "cuerpo no es JSON");
      return created;
    }

    const parsed = parsePayload(json);
    if (!parsed.ok) {
      await this.recordFailure(bodyHash, json, parsed.error);
      return created;
    }

    for (const message of parsed.messages) {
      const inserted = await this.ingestMessage(message);
      if (inserted) created.push(inserted);
    }

    for (const call of parsed.calls) {
      await this.ingestCall(call, json);
    }

    if (parsed.messages.length === 0 && parsed.calls.length === 0) {
      // Solo statuses u otros eventos ignorados: se registran como procesados.
      const { alreadyProcessed } = await this.events.saveEvent(bodyHash, json);
      if (!alreadyProcessed) await this.events.markProcessed(bodyHash, null);
    }

    return created;
  }

  private async ingestMessage(message: InboundMessage): Promise<NewInboundMessage | null> {
    const eventId = message.wamid;
    let tenantId: string | null = null;
    try {
      const { alreadyProcessed } = await this.events.saveEvent(eventId, message);
      if (alreadyProcessed) return null;

      tenantId = await this.tenants.findTenantIdByPhoneNumberId(message.phoneNumberId);
      if (!tenantId) {
        await this.events.markFailed(
          eventId,
          null,
          `phone_number_id desconocido: ${message.phoneNumberId}`,
        );
        return null;
      }

      const contactId = await this.contacts.upsertContact(tenantId, {
        waId: message.waId,
        phoneE164: message.phoneE164,
        name: message.profileName,
      });
      const conversationId = await this.contacts.upsertConversation(
        tenantId,
        contactId,
        message.occurredAt,
      );
      const inserted = await this.contacts.insertMessageIfNew(tenantId, conversationId, {
        wamid: message.wamid,
        direction: "inbound",
        kind: message.kind,
        body: message.body,
        occurredAt: message.occurredAt,
      });
      await this.events.markProcessed(eventId, tenantId);
      return inserted
        ? { tenantId, conversationId, messageId: message.wamid, kind: message.kind }
        : null;
    } catch (error) {
      await this.safeMarkFailed(eventId, tenantId, error);
      return null;
    }
  }

  private async ingestCall(call: InboundCall, payload: unknown): Promise<void> {
    const eventId = `call:${call.waCallId}:${call.event}`;
    let tenantId: string | null = null;
    try {
      const { alreadyProcessed } = await this.events.saveEvent(eventId, payload);
      if (alreadyProcessed) return;

      tenantId = await this.tenants.findTenantIdByPhoneNumberId(call.phoneNumberId);
      if (!tenantId) {
        await this.events.markFailed(
          eventId,
          null,
          `phone_number_id desconocido: ${call.phoneNumberId}`,
        );
        return;
      }
      if (!this.calls) {
        await this.events.markFailed(eventId, tenantId, "sin manejador de llamadas configurado");
        return;
      }

      await this.calls.handle(tenantId, call);
      await this.events.markProcessed(eventId, tenantId);
    } catch (error) {
      await this.safeMarkFailed(eventId, tenantId, error);
    }
  }

  private async recordFailure(eventId: string, payload: unknown, error: string): Promise<void> {
    try {
      await this.events.saveEvent(eventId, payload);
      await this.events.markFailed(eventId, null, error);
    } catch {
      // Sin dónde registrar: se descarta; la respuesta 200 ya salió.
    }
  }

  private async safeMarkFailed(
    eventId: string,
    tenantId: string | null,
    error: unknown,
  ): Promise<void> {
    const text = (error instanceof Error ? error.message : String(error)).slice(
      0,
      PROVIDER_ERROR_MAX,
    );
    try {
      await this.events.markFailed(eventId, tenantId, text);
    } catch {
      // Ídem: no se puede registrar el fallo.
    }
  }
}
