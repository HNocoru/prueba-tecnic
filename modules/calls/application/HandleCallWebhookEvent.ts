import type { CallWebhookEvent } from "../domain/Call";
import type { CallWebhookRepository, WhatsAppCallGateway } from "./ports";

/**
 * Caso de uso: aplica un evento del campo calls de Meta.
 * connect crea la fila calls y contesta la llamada por el Connector de LiveKit;
 * terminate NO cierra la fila (la cierra el end del worker, que trae motivo y duración):
 * solo cuelga el lado LiveKit. El tenant llega resuelto por phone_number_id desde el
 * módulo de WhatsApp.
 */
export class HandleCallWebhookEvent {
  constructor(
    private readonly calls: CallWebhookRepository,
    private readonly gateway: WhatsAppCallGateway,
  ) {}

  async execute(tenantId: string, event: CallWebhookEvent): Promise<void> {
    if (event.event === "terminate") {
      await this.disconnectBestEffort(event.waCallId);
      return;
    }

    const { callId, created } = await this.calls.startCall(tenantId, event);
    // Idempotencia por wacid: un reintento de Meta no vuelve a contestar la llamada.
    if (!created) return;
    if (!event.sdpOffer) throw new Error("La llamada connect no trae SDP offer (session.sdp)");

    await this.gateway.accept({
      callId,
      waCallId: event.waCallId,
      phoneNumberId: event.phoneNumberId,
      sdpOffer: event.sdpOffer,
      roomName: `call-${callId}`,
    });
  }

  /** Best-effort: el Connector puede responder "ya desconectada". */
  private async disconnectBestEffort(waCallId: string): Promise<void> {
    try {
      await this.gateway.disconnect(waCallId, "user_initiated");
    } catch {
      // Sin secretos en logs: el adaptador ya devuelve un error sanitizado, pero no se propaga.
    }
  }
}
