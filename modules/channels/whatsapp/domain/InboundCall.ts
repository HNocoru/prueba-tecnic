/**
 * Evento normalizado del campo calls de Meta (connect/terminate).
 * El formato exacto del Connector de WhatsApp está "Por verificar"
 * (docs/02-architecture.md §11): este tipo no debe confundirse con el payload crudo.
 */
export interface InboundCall {
  readonly waCallId: string;
  readonly phoneNumberId: string;
  readonly event: "connect" | "terminate";
  readonly waId: string | null;
  readonly occurredAt: Date;
  /** session.sdp (offer) del webhook connect; null en terminate. */
  readonly sdpOffer: string | null;
}
