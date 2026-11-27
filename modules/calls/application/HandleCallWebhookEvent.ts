import type { CallWebhookEvent } from "../domain/Call";
import type { CallWebhookRepository, WhatsAppCallGateway } from "./ports";

/** Tope para armar el snapshot antes de contestar sin él. */
const SNAPSHOT_TIMEOUT_MS = 2000;

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
    /** Arma el contexto del negocio; opcional. Si falla o tarda, la llamada se contesta sin él. */
    private readonly snapshot?: (callId: string) => Promise<unknown | null>,
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

    const contextSnapshot = await this.snapshotBestEffort(callId);

    await this.gateway.accept({
      callId,
      waCallId: event.waCallId,
      phoneNumberId: event.phoneNumberId,
      sdpOffer: event.sdpOffer,
      roomName: `call-${callId}`,
      ...(contextSnapshot == null ? {} : { contextSnapshot }),
    });
  }

  /** La llamada nunca se pierde por el snapshot: error o más de 2 s significa seguir sin él. */
  private async snapshotBestEffort(callId: string): Promise<unknown | null> {
    if (!this.snapshot) return null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), SNAPSHOT_TIMEOUT_MS);
      });
      return await Promise.race([this.snapshot(callId), timeout]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
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
