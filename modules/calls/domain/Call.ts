/** Entidades y reglas del módulo calls: una llamada de WhatsApp y sus turnos. */

export type CallOutcome = "completed" | "caller_hangup" | "time_limit" | "failed" | "missed";
export type TurnRole = "user" | "assistant";
export type CallWebhookEventName = "connect" | "terminate";

/** Tope duro de la llamada y momento de la despedida (docs/02-architecture.md §10). */
export const MAX_CALL_SECONDS = 300;
export const GOODBYE_AT_SECONDS = 270;

export interface StoredCall {
  readonly id: string;
  readonly tenantId: string;
  readonly conversationId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

export interface BusinessContext {
  readonly name: string;
  readonly tone: string;
  readonly faq: string;
  readonly hours: string;
  readonly voice: string;
  readonly language: string;
}

export interface ContactContext {
  readonly displayName: string | null;
  readonly isNew: boolean;
}

export interface ContextTurn {
  readonly role: TurnRole;
  readonly channel: "text" | "voice";
  readonly text: string;
  readonly at: string;
}

/** Datos que el asistente necesita antes de abrir la sesión de voz. */
export interface CallContextData {
  readonly business: BusinessContext;
  readonly contact: ContactContext;
  readonly recentTurns: ContextTurn[];
}

export interface CallTurnInput {
  readonly seq: number;
  readonly role: TurnRole;
  readonly text: string;
  readonly startedMs: number;
}

/** Evento normalizado del webhook calls; el formato exacto de Meta está "Por verificar". */
export interface CallWebhookEvent {
  readonly waCallId: string;
  readonly event: CallWebhookEventName;
  readonly waId: string | null;
  readonly occurredAt: Date;
  /** phone_number_id de Meta del negocio que recibe la llamada. */
  readonly phoneNumberId: string;
  /** SDP offer de session.sdp; solo viene en connect. */
  readonly sdpOffer: string | null;
}

export interface EndCallInput {
  readonly endedReason: CallOutcome;
  readonly answeredAt: string | null;
  readonly endedAt: string;
  readonly durationSec: number;
  readonly error: string | null;
}
