import type { CallWebhookEvent } from "../domain/Call";
import type { CallWebhookRepository } from "./ports";

/**
 * Caso de uso: aplica un evento del campo calls de Meta.
 * connect crea la fila calls; terminate la cierra. El tenant llega resuelto por
 * phone_number_id desde el módulo de WhatsApp.
 */
export class HandleCallWebhookEvent {
  constructor(private readonly calls: CallWebhookRepository) {}

  async execute(tenantId: string, event: CallWebhookEvent): Promise<void> {
    if (event.event === "terminate") {
      await this.calls.endCall(tenantId, event.waCallId, event.occurredAt);
      return;
    }
    await this.calls.startCall(tenantId, event);
  }
}
