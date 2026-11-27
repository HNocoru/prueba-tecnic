import {
  type AcceptWhatsAppCallOptions,
  ConnectorClient,
  DisconnectWhatsAppCallRequest_DisconnectReason,
  RoomAgentDispatch,
  SessionDescription,
} from "livekit-server-sdk";

import type { AcceptCallInput, DisconnectReason, WhatsAppCallGateway } from "../application/ports";

/** Subconjunto de ConnectorClient (livekit-server-sdk) que usa el adaptador; facilita el fake. */
export interface ConnectorLike {
  acceptWhatsAppCall(options: AcceptWhatsAppCallOptions): Promise<unknown>;
  disconnectWhatsAppCall(
    whatsappCallId: string,
    whatsappApiKey: string,
    disconnectReason?: DisconnectWhatsAppCallRequest_DisconnectReason,
  ): Promise<unknown>;
}

export interface LiveKitGatewayConfig {
  /** Token de acceso de la Cloud API de Meta (WHATSAPP_ACCESS_TOKEN). Nunca se registra. */
  readonly whatsappApiKey: string;
  /** Versión de la Cloud API soportada por el Connector: 23.0, 24.0, 25.0 o 26.0. */
  readonly cloudApiVersion: string;
  /** Nombre con el que el worker registra el agente (despacho explícito). */
  readonly agentName: string;
}

export const DEFAULT_CLOUD_API_VERSION = "26.0";
export const DEFAULT_AGENT_NAME = "whatsapp-agent";

/** Adaptador del WhatsApp Connector de LiveKit Cloud (ConnectorClient del SDK Node). */
export class LiveKitWhatsAppCallGateway implements WhatsAppCallGateway {
  constructor(
    private readonly connector: ConnectorLike,
    private readonly config: LiveKitGatewayConfig,
  ) {}

  static fromCredentials(
    credentials: { url: string; apiKey: string; apiSecret: string },
    config: LiveKitGatewayConfig,
  ): LiveKitWhatsAppCallGateway {
    // ConnectorClient pide host http(s); LIVEKIT_URL suele ser wss://.
    const host = credentials.url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    return new LiveKitWhatsAppCallGateway(
      new ConnectorClient(host, credentials.apiKey, credentials.apiSecret),
      config,
    );
  }

  async accept(input: AcceptCallInput): Promise<void> {
    // El worker (call_id.py) lee call_id de la metadata del job (JSON) o del atributo del
    // participante; se envían ambas vías con el UUID interno.
    const metadata = JSON.stringify({ call_id: input.callId });
    try {
      await this.connector.acceptWhatsAppCall({
        whatsappPhoneNumberId: input.phoneNumberId,
        whatsappApiKey: this.config.whatsappApiKey,
        whatsappCloudApiVersion: this.config.cloudApiVersion,
        whatsappCallId: input.waCallId,
        sdp: new SessionDescription({ type: "offer", sdp: input.sdpOffer }),
        roomName: input.roomName,
        agents: [new RoomAgentDispatch({ agentName: this.config.agentName, metadata })],
        participantMetadata: metadata,
        participantAttributes: { call_id: input.callId },
      });
    } catch (error) {
      throw this.sanitized("AcceptWhatsAppCall", error);
    }
  }

  async disconnect(waCallId: string, reason: DisconnectReason): Promise<void> {
    try {
      // user_initiated (terminate de Meta): la llamada ya terminó, no se vuelve a llamar a Meta.
      // business_initiated (time_limit): el Connector pide a Meta terminar la llamada.
      await this.connector.disconnectWhatsAppCall(
        waCallId,
        this.config.whatsappApiKey,
        reason === "business_initiated"
          ? DisconnectWhatsAppCallRequest_DisconnectReason.BUSINESS_INITIATED
          : DisconnectWhatsAppCallRequest_DisconnectReason.USER_INITIATED,
      );
    } catch (error) {
      throw this.sanitized("DisconnectWhatsAppCall", error);
    }
  }

  /**
   * Error sin el mensaje original (podría incluir el token o el SDP). Conserva el código
   * y el estado HTTP del Connector, que son seguros y necesarios para diagnosticar.
   */
  private sanitized(operation: string, error: unknown): Error {
    const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
    const codeText = typeof code === "string" ? code : "desconocido";
    const statusText = typeof status === "number" ? String(status) : "desconocido";
    return new Error(
      `${operation} falló en el Connector de LiveKit (código ${codeText}, estado ${statusText}): ${this.redactedMessage(error)}`,
    );
  }

  /**
   * Mensaje del Connector/Meta para diagnosticar, sin secretos: se tapa la clave exacta de
   * configuración y toda cadena larga con aspecto de token o SDP, y se limita el largo.
   */
  private redactedMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : "";
    const key = this.config.whatsappApiKey;
    const withoutKey = key ? raw.split(key).join("[oculto]") : raw;
    return withoutKey
      .replace(/[A-Za-z0-9_\-.]{32,}/g, "[oculto]")
      .replace(/\s+/g, " ")
      .slice(0, 240);
  }
}
